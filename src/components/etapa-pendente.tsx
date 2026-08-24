import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

import { PENDENCIAS_BACKEND } from "@/api/pendencias";
import { Button } from "@/components/ui/button";

/**
 * Placeholder honesto: a tela ainda não existe porque a etapa não foi
 * liberada. Nenhum dado falso é exibido.
 */
export function EtapaPendente({
  etapa,
  descricao,
  dependencias = [],
}: {
  etapa: string;
  descricao: string;
  dependencias?: string[];
}) {
  const pendencias = PENDENCIAS_BACKEND.filter((p) =>
    dependencias.includes(p.id),
  );

  return (
    <div className="max-w-2xl rounded-md border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Lock className="size-4 text-muted-foreground" />
        {etapa}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{descricao}</p>

      {pendencias.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Depende do backend
          </p>
          <ul className="mt-2 space-y-2">
            {pendencias.map((p) => (
              <li
                key={p.id}
                className="rounded-sm border border-border bg-muted/40 px-3 py-2 text-sm"
              >
                <span className="font-medium text-foreground">{p.titulo}</span>
                <span className="block text-muted-foreground">{p.detalhe}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Button asChild variant="outline" size="sm" className="mt-4">
        <Link to="/conexao">Ver estado da API</Link>
      </Button>
    </div>
  );
}
