import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { LoadingBloco } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import {
  confirmarPresenca,
  identificarNoPonto,
  obterContextoPonto,
  registrarPonto,
} from "@/lib/ponto.functions";
import {
  dataHora,
  formatarCpf,
  hora,
  ROTULO_TIPO_PONTO,
  soDigitos,
  type TipoPonto,
} from "@/lib/dominio";

export const Route = createFileRoute("/ponto/$token")({
  head: () => ({
    meta: [
      { title: "Registrar ponto — PayCrew" },
      {
        name: "description",
        content:
          "Freelancer: informe seu CPF para confirmar presença e registrar entrada, intervalo e saída no evento.",
      },
      { property: "og:title", content: "Registrar ponto — PayCrew" },
      {
        property: "og:description",
        content: "Check-in e check-out da equipe do evento pelo celular.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaPonto,
});

const SEQUENCIA: TipoPonto[] = ["entrada", "inicio_intervalo", "fim_intervalo", "saida"];

function PaginaPonto() {
  const { token } = Route.useParams();
  const [cpf, setCpf] = useState("");
  const [identificado, setIdentificado] = useState<{
    escalaId: string;
    nome: string;
    statusEscala: string;
    pontos: { id: string; tipo: string; registrado_em: string; status: string }[];
  } | null>(null);

  const obterCtx = useServerFn(obterContextoPonto);
  const identificarFn = useServerFn(identificarNoPonto);
  const confirmarFn = useServerFn(confirmarPresenca);
  const registrarFn = useServerFn(registrarPonto);

  const contexto = useQuery({
    queryKey: ["ponto-contexto", token],
    queryFn: () => obterCtx({ data: { token } }),
    retry: false,
  });

  const identificar = useMutation({
    mutationFn: () => identificarFn({ data: { token, cpf: soDigitos(cpf) } }),
    onSuccess: (d) => setIdentificado(d),
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmar = useMutation({
    mutationFn: () => confirmarFn({ data: { token, cpf: soDigitos(cpf) } }),
    onSuccess: () => {
      toast.success("Presença confirmada.");
      identificar.mutate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const registrar = useMutation({
    mutationFn: async (tipo: TipoPonto) => {
      let fotoBase64: string | null = null;
      if (contexto.data?.exigeSelfie) {
        fotoBase64 = await tirarSelfie();
      }
      let lat: number | null = null;
      let lng: number | null = null;
      if (contexto.data?.exigeGps) {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10_000 }),
        ).catch(() => {
          throw new Error("Não foi possível obter sua localização.");
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }
      return registrarFn({
        data: {
          token,
          cpf: soDigitos(cpf),
          escalaId: identificado!.escalaId,
          tipo,
          fotoBase64,
          lat,
          lng,
        },
      });
    },
    onSuccess: () => {
      toast.success("Ponto registrado. Aguarde a aprovação do supervisor.");
      identificar.mutate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (contexto.isPending) {
    return (
      <main className="mx-auto max-w-md p-4">
        <LoadingBloco linhas={4} />
      </main>
    );
  }

  if (contexto.isError) {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-lg font-semibold">QR Code inválido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Peça ao supervisor o código correto deste evento.
        </p>
      </main>
    );
  }

  const ctx = contexto.data;
  const registrados = new Set(identificado?.pontos.map((p) => p.tipo) ?? []);

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <header>
        <h1 className="text-lg font-semibold text-foreground">{ctx.evento.nome}</h1>
        <p className="text-sm text-muted-foreground">
          {dataHora(ctx.evento.data_inicio)}
          {ctx.evento.local ? ` · ${ctx.evento.local}` : ""}
        </p>
      </header>

      {!identificado ? (
        <form
          className="space-y-3 rounded-md border border-border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (soDigitos(cpf).length !== 11) {
              toast.error("Informe os 11 dígitos do CPF.");
              return;
            }
            identificar.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="cpf">Seu CPF</Label>
            <Input
              id="cpf"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={formatarCpf(cpf)}
              onChange={(e) => setCpf(soDigitos(e.target.value).slice(0, 11))}
            />
          </div>
          <Button type="submit" className="w-full" disabled={identificar.isPending}>
            Entrar
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
            <div>
              <p className="text-sm font-medium">{identificado.nome}</p>
              <p className="text-xs text-muted-foreground">Sua escala neste evento</p>
            </div>
            <StatusBadge status={identificado.statusEscala} />
          </div>

          {identificado.statusEscala === "convidado" ? (
            <div className="rounded-md border border-border bg-card p-4">
              <p className="text-sm">
                Você foi convidado para este evento. Confirme sua presença para poder
                registrar o ponto.
              </p>
              <Button
                className="mt-3 w-full"
                onClick={() => confirmar.mutate()}
                disabled={confirmar.isPending}
              >
                Confirmar presença
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {SEQUENCIA.map((tipo) => (
                <Button
                  key={tipo}
                  variant={registrados.has(tipo) ? "outline" : "default"}
                  className="h-16"
                  disabled={registrar.isPending}
                  onClick={() => registrar.mutate(tipo)}
                >
                  {ROTULO_TIPO_PONTO[tipo]}
                </Button>
              ))}
            </div>
          )}

          <section className="rounded-md border border-border bg-card">
            <h2 className="border-b border-border px-4 py-2 text-sm font-semibold">
              Seus registros
            </h2>
            {identificado.pontos.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhum ponto registrado ainda.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {identificado.pontos.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between px-4 py-2 text-sm"
                  >
                    <span>{ROTULO_TIPO_PONTO[p.tipo as TipoPonto]}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {hora(p.registrado_em)}
                      <StatusBadge status={p.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

/** Captura uma selfie usando a câmera frontal do celular. */
async function tirarSelfie(): Promise<string> {
  if (!window.isSecureContext) {
    throw new Error("A câmera só funciona em uma conexão segura (HTTPS).");
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Este dispositivo ou navegador não oferece acesso à câmera.");
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (error) {
    const nome = error instanceof DOMException ? error.name : "";
    if (nome === "NotAllowedError" || nome === "PermissionDeniedError") {
      throw new Error("Permita o acesso à câmera no navegador para registrar o ponto.");
    }
    if (nome === "NotFoundError" || nome === "DevicesNotFoundError") {
      throw new Error("Nenhuma câmera foi encontrada neste dispositivo.");
    }
    throw new Error("Não foi possível acessar a câmera. Verifique a permissão e tente novamente.");
  }

  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    await new Promise<void>((resolve) => {
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        resolve();
        return;
      }
      video.addEventListener("loadedmetadata", () => resolve(), { once: true });
    });
    await video.play();
    await new Promise((r) => setTimeout(r, 800));
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}
