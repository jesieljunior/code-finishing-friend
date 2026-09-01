import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenSchema = z.object({ token: z.string().min(8).max(128) });

const identificarSchema = tokenSchema.extend({
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos"),
});

const registrarSchema = identificarSchema.extend({
  escalaId: z.string().uuid(),
  tipo: z.enum(["entrada", "saida", "inicio_intervalo", "fim_intervalo"]),
  fotoBase64: z.string().max(4_000_000).nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

/** Contexto público mínimo do evento a partir do token do QR Code. */
export const obterContextoPonto = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: evento } = await supabaseAdmin
      .from("eventos")
      .select("id, nome, local, status, empresa_id, data_inicio")
      .eq("qr_code_token", data.token)
      .maybeSingle();

    if (!evento) throw new Error("QR Code inválido.");

    const { data: config } = await supabaseAdmin
      .from("configuracoes")
      .select("checkin_exige_selfie, checkin_exige_gps")
      .eq("empresa_id", evento.empresa_id)
      .maybeSingle();

    return {
      evento: {
        nome: evento.nome,
        local: evento.local,
        status: evento.status,
        data_inicio: evento.data_inicio,
      },
      exigeSelfie: config?.checkin_exige_selfie ?? false,
      exigeGps: config?.checkin_exige_gps ?? false,
    };
  });

async function localizarEscala(token: string, cpf: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: evento } = await supabaseAdmin
    .from("eventos")
    .select("id, empresa_id, status")
    .eq("qr_code_token", token)
    .maybeSingle();
  if (!evento) throw new Error("QR Code inválido.");

  const { data: freelancer } = await supabaseAdmin
    .from("freelancers")
    .select("id, nome")
    .eq("empresa_id", evento.empresa_id)
    .eq("cpf", cpf)
    .maybeSingle();
  if (!freelancer) throw new Error("CPF não encontrado nesta agência.");

  const { data: equipes } = await supabaseAdmin
    .from("equipes")
    .select("id")
    .eq("evento_id", evento.id);
  const ids = (equipes ?? []).map((q) => q.id);
  if (ids.length === 0) throw new Error("Você não está escalado neste evento.");

  const { data: escala } = await supabaseAdmin
    .from("escalas")
    .select("id, status")
    .eq("freelancer_id", freelancer.id)
    .in("equipe_id", ids)
    .neq("status", "substituido")
    .maybeSingle();
  if (!escala) throw new Error("Você não está escalado neste evento.");
  if (escala.status === "recusado")
    throw new Error("Sua participação neste evento foi recusada.");

  return { supabaseAdmin, evento, freelancer, escala };
}

/** Identifica o freelancer pelo CPF e devolve os pontos que ele já registrou. */
export const identificarNoPonto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => identificarSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin, escala, freelancer } = await localizarEscala(
      data.token,
      data.cpf,
    );

    const { data: pontos } = await supabaseAdmin
      .from("pontos")
      .select("id, tipo, registrado_em, status")
      .eq("escala_id", escala.id)
      .order("registrado_em");

    return {
      escalaId: escala.id,
      statusEscala: escala.status,
      nome: freelancer.nome,
      pontos: pontos ?? [],
    };
  });

/** Confirma a presença na escala a partir do próprio celular do freelancer. */
export const confirmarPresenca = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => identificarSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin, escala } = await localizarEscala(data.token, data.cpf);
    if (escala.status !== "convidado") return { ok: true };
    const { error } = await supabaseAdmin
      .from("escalas")
      .update({ status: "confirmado", confirmado_em: new Date().toISOString() })
      .eq("id", escala.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Registra entrada, intervalo ou saída. Fica pendente até o supervisor aprovar. */
export const registrarPonto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => registrarSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin, evento, escala } = await localizarEscala(
      data.token,
      data.cpf,
    );
    if (escala.id !== data.escalaId) throw new Error("Escala inválida.");

    const { data: config } = await supabaseAdmin
      .from("configuracoes")
      .select("checkin_exige_selfie, checkin_exige_gps")
      .eq("empresa_id", evento.empresa_id)
      .maybeSingle();

    if (config?.checkin_exige_selfie && !data.fotoBase64)
      throw new Error("Esta agência exige selfie no registro de ponto.");
    if (config?.checkin_exige_gps && (data.lat == null || data.lng == null))
      throw new Error("Esta agência exige a localização no registro de ponto.");

    let fotoUrl: string | null = null;
    if (data.fotoBase64) {
      const base64 = data.fotoBase64.split(",").pop() ?? "";
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const caminho = `${evento.empresa_id}/${escala.id}/${crypto.randomUUID()}.jpg`;
      const { error: erroUpload } = await supabaseAdmin.storage
        .from("selfies-ponto")
        .upload(caminho, bytes, { contentType: "image/jpeg" });
      if (erroUpload) throw new Error(erroUpload.message);
      fotoUrl = caminho;
    }

    const { error } = await supabaseAdmin.from("pontos").insert({
      escala_id: escala.id,
      tipo: data.tipo,
      metodo: data.fotoBase64 ? "selfie" : "qrcode",
      registrado_em: new Date().toISOString(),
      foto_url: fotoUrl,
      gps_lat: data.lat ?? null,
      gps_lng: data.lng ?? null,
      status: "pendente",
    });
    if (error) throw new Error(error.message);

    return { ok: true };
  });
