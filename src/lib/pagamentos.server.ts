/**
 * Núcleo do Pix de saída ao freelancer e da taxa da PayCrew.
 * Recebe o cliente Supabase de fora para servir tanto a agência (RLS do
 * usuário) quanto o suporte da plataforma (cliente administrativo).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const arredonda = (n: number) => Math.round(n * 100) / 100;

async function exigirCadastroFiscalValidado(supabase: any, empresaId: string) {
  const { data: validada, error } = await supabase.rpc("empresa_fiscal_validada", {
    _empresa_id: empresaId,
  });
  if (error) throw new Error("Não foi possível verificar o cadastro fiscal da agência.");
  if (!validada) {
    throw new Error(
      "Pix bloqueado: complete e aguarde a validação do cadastro fiscal da agência.",
    );
  }
}

export type PrecoEfetivo = {
  modelo: "percentual_evento" | "taxa_fixa_pix" | "assinatura_percentual";
  percentual: number;
  taxa_fixa_pix: number;
  mensalidade: number;
  status: string;
  trial_ate: string | null;
  em_trial: boolean;
  plano_nome: string | null;
  cupom_codigo: string | null;
};

/** Preço válido hoje para a agência: plano + ajustes + trial + cupom. */
export async function precoEfetivo(
  supabase: any,
  empresaId: string,
): Promise<PrecoEfetivo | null> {
  const { data } = await supabase.rpc("preco_efetivo", { _empresa_id: empresaId });
  const linha = Array.isArray(data) ? data[0] : data;
  if (!linha) return null;
  return {
    ...linha,
    percentual: Number(linha.percentual ?? 0),
    taxa_fixa_pix: Number(linha.taxa_fixa_pix ?? 0),
    mensalidade: Number(linha.mensalidade ?? 0),
  } as PrecoEfetivo;
}

/**
 * Garante a taxa da plataforma conforme o plano da agência:
 * - percentual: uma taxa por evento, sobre o total dos fechamentos aprovados;
 * - taxa fixa: uma taxa por Pix enviado.
 */
export async function garantirTaxa(
  supabase: any,
  args: { empresaId: string; eventoId: string | null; pagamentoId: string; valorPix: number },
) {
  const preco = await precoEfetivo(supabase, args.empresaId);
  if (!preco || preco.em_trial) return null;

  if (preco.modelo === "taxa_fixa_pix") {
    const valor = arredonda(preco.taxa_fixa_pix);
    if (valor <= 0) return null;
    const { data } = await supabase
      .from("taxas_plataforma")
      .insert({
        empresa_id: args.empresaId,
        pagamento_id: args.pagamentoId,
        modelo: preco.modelo,
        base_calculo: args.valorPix,
        valor,
        status: "cobrada",
      })
      .select("id, valor")
      .maybeSingle();
    return data ?? null;
  }

  if (!args.eventoId) return null;

  const { data: jaExiste } = await supabase
    .from("taxas_plataforma")
    .select("id")
    .eq("evento_id", args.eventoId)
    .maybeSingle();
  if (jaExiste) return null;

  const { data: cobrancaComSplit } = await supabase
    .from("cobrancas")
    .select("id")
    .eq("evento_id", args.eventoId)
    .eq("status", "pago")
    .not("parceiro_cobranca_id", "is", null)
    .limit(1)
    .maybeSingle();

  const masterWalletId = process.env["ASAAS_MASTER_WALLET_ID"];
  if (cobrancaComSplit && masterWalletId) return null;

  const { data: fechamentos } = await supabase
    .from("fechamentos")
    .select("valor_calculado, status, escalas!inner(equipes!inner(evento_id))")
    .eq("escalas.equipes.evento_id", args.eventoId)
    .eq("status", "aprovado");

  const base = (fechamentos ?? []).reduce(
    (s: number, f: { valor_calculado: number }) => s + Number(f.valor_calculado),
    0,
  );
  const valor = arredonda((base * preco.percentual) / 100);
  if (valor <= 0) return null;

  const { data } = await supabase
    .from("taxas_plataforma")
    .insert({
      empresa_id: args.empresaId,
      evento_id: args.eventoId,
      modelo: preco.modelo,
      base_calculo: base,
      valor,
      status: "cobrada",
    })
    .select("id, valor")
    .maybeSingle();
  return data ?? null;
}

/** Resolve a empresa do pagamento seguindo a cadeia de dependência do pagamento. */
export async function resolverEmpresaDoPagamento(supabase: any, pagamentoId: string): Promise<string> {
  const { data: pagamento } = await supabase
    .from("pagamentos")
    .select("id, fechamento_id")
    .eq("id", pagamentoId)
    .maybeSingle();
  if (!pagamento) throw new Error("Pagamento não encontrado.");

  const { data: fechamento } = await supabase
    .from("fechamentos")
    .select("id, escala_id")
    .eq("id", pagamento.fechamento_id)
    .maybeSingle();
  if (!fechamento) throw new Error("Fechamento do pagamento não encontrado.");

  const { data: escala } = await supabase
    .from("escalas")
    .select("id, equipe_id")
    .eq("id", fechamento.escala_id)
    .maybeSingle();
  if (!escala) throw new Error("Escala do pagamento não encontrada.");

  const { data: equipe } = await supabase
    .from("equipes")
    .select("id, evento_id")
    .eq("id", escala.equipe_id)
    .maybeSingle();
  if (!equipe) throw new Error("Equipe do pagamento não encontrada.");

  const { data: evento } = await supabase
    .from("eventos")
    .select("id, empresa_id")
    .eq("id", equipe.evento_id)
    .maybeSingle();
  if (!evento?.empresa_id) throw new Error("Não foi possível identificar a agência do pagamento.");

  return evento.empresa_id as string;
}

/** Valida saldo, envia o Pix, debita o saldo e cobra a taxa da plataforma. */
export async function enviarPix(supabase: any, pagamentoId: string, empresaId?: string | null) {
  const { data: pagamento } = await supabase
    .from("pagamentos")
    .select(
      "id, valor, status, fechamento_id, chave_idempotencia, fechamentos(escala_id, escalas(freelancers(nome, chave_pix), equipes(evento_id, eventos(nome, empresa_id))))",
    )
    .eq("id", pagamentoId)
    .maybeSingle();
  if (!pagamento) throw new Error("Pagamento não encontrado.");
  if (pagamento.status === "executado") throw new Error("Pagamento já executado.");

  const primeiro = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

  const fechamento: any = primeiro(pagamento.fechamentos);
  const escala: any = primeiro(fechamento?.escalas);
  const freelancer: any = primeiro(escala?.freelancers);
  const equipe: any = primeiro(escala?.equipes);
  const evento: any = primeiro(equipe?.eventos);

  const chavePix: string | undefined = freelancer?.chave_pix;
  const empresaResolvida = empresaId ?? evento?.empresa_id ?? null;
  if (!chavePix) throw new Error("Freelancer sem chave Pix cadastrada.");
  if (!empresaResolvida) throw new Error("Não foi possível identificar a agência do pagamento.");

  if (evento?.empresa_id && empresaResolvida !== evento.empresa_id) {
    throw new Error("Pagamento vinculado a outra agência.");
  }

  const valor = Number(pagamento.valor);
  const empresaDestino = empresaResolvida;
  try {
    await exigirCadastroFiscalValidado(supabase, empresaDestino);
    const { data: saldo } = await supabase.rpc("saldo_empresa", { _empresa_id: empresaDestino });
    if (Number(saldo ?? 0) < valor)
      throw new Error(
        `Saldo insuficiente: disponível R$ ${Number(saldo ?? 0).toFixed(2)}, necessário R$ ${valor.toFixed(2)}. Adicione saldo para continuar.`,
      );

    const { transferirPix } = await import("./asaas.server");
    const transferencia = await transferirPix({
      valor,
      chavePix,
      descricao: `PayCrew — ${freelancer?.nome ?? "freelancer"} · ${evento?.nome ?? "evento"}`,
      referenciaExterna: pagamento.id,
      chaveIdempotencia: pagamento.chave_idempotencia,
    });

    await supabase
      .from("pagamentos")
      .update({
        status: "executado",
        executado_em: new Date().toISOString(),
        txid_parceiro: transferencia.id,
        parceiro_transferencia_id: transferencia.id,
        chave_pix_destino: chavePix,
        erro: null,
      })
      .eq("id", pagamento.id);

    await supabase.from("movimentos_saldo").insert({
      empresa_id: empresaDestino,
      tipo: "debito",
      valor,
      descricao: `Pix para ${freelancer?.nome ?? "freelancer"}`,
      pagamento_id: pagamento.id,
    });

    const taxa = await garantirTaxa(supabase, {
      empresaId: empresaDestino,
      eventoId: equipe?.evento_id ?? null,
      pagamentoId: pagamento.id,
      valorPix: valor,
    });

    if (taxa) {
      await supabase.from("movimentos_saldo").insert({
        empresa_id: empresaDestino,
        tipo: "debito",
        valor: taxa.valor,
        descricao: "Taxa PayCrew",
        taxa_id: taxa.id,
      });
    }

    return { ok: true, txid: transferencia.id as string, taxa: Number(taxa?.valor ?? 0) };
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Falha ao enviar o Pix.";
    await supabase
      .from("pagamentos")
      .update({ status: "falhou", erro: mensagem })
      .eq("id", pagamento.id);
    throw new Error(mensagem);
  }
}

/** Processa pagamentos agendados vencidos; o cron externo deve chamar esta função. */
export async function processarPagamentosAgendados(supabase: any, limite = 50) {
  const agora = new Date().toISOString();
  const { data: pagamentos, error } = await supabase
    .from("pagamentos")
    .select("id")
    .eq("status", "agendado")
    .not("data_agendada", "is", null)
    .lte("data_agendada", agora)
    .order("data_agendada", { ascending: true })
    .limit(limite);
  if (error) throw error;

  const resultados = { processados: 0, falhos: 0 };
  for (const pagamento of pagamentos ?? []) {
    try {
      await enviarPix(supabase, pagamento.id);
      resultados.processados += 1;
    } catch {
      resultados.falhos += 1;
    }
  }
  return resultados;
}
