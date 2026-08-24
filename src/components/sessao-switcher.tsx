import { useState } from "react";
import { UserCog } from "lucide-react";

import { PapelUsuario, type UUID } from "@/api/types";
import { useAuth } from "@/auth/AuthProvider";
import { ROTULO_PAPEL } from "@/auth/permissions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * COMPATIBILIDADE TEMPORÁRIA — não é login.
 *
 * O FastAPI ainda não tem autenticação. Enquanto isso, o operador informa
 * manualmente a empresa (UUID) e o papel para o frontend saber o que
 * consultar e o que exibir. Quando /auth/login existir, este componente é
 * substituído pela tela de login e o token passa a vir da API.
 */
export function SessaoSwitcher() {
  const { sessao, definirSessao, sair, carregado } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [empresaId, setEmpresaId] = useState<UUID>(sessao?.empresaId ?? "");
  const [usuarioId, setUsuarioId] = useState(sessao?.usuarioId ?? "");
  const [nome, setNome] = useState(sessao?.nomeExibicao ?? "");
  const [papel, setPapel] = useState<PapelUsuario>(
    sessao?.papel ?? PapelUsuario.ADMIN,
  );

  if (!carregado) return null;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserCog className="size-4" />
          <span className="hidden sm:inline">
            {sessao ? ROTULO_PAPEL[sessao.papel] : "Definir sessão"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sessão de trabalho</DialogTitle>
          <DialogDescription>
            Temporário: o backend ainda não expõe autenticação. Informe a
            empresa e o papel para o frontend saber o que consultar. Isso não
            concede permissão — a autorização será do FastAPI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="empresa-id">ID da empresa (UUID)</Label>
            <Input
              id="empresa-id"
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value.trim())}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="papel">Papel</Label>
            <Select
              value={papel}
              onValueChange={(v) => setPapel(v as PapelUsuario)}
            >
              <SelectTrigger id="papel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PapelUsuario).map((p) => (
                  <SelectItem key={p} value={p}>
                    {ROTULO_PAPEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usuario-id">
              ID do usuário (opcional, UUID do backend)
            </Label>
            <Input
              id="usuario-id"
              value={usuarioId}
              onChange={(e) => setUsuarioId(e.target.value.trim())}
              placeholder="usado onde a API pede supervisor_id / aprovado_por_id"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome exibido (opcional)</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          {sessao ? (
            <Button
              variant="ghost"
              onClick={() => {
                sair();
                setAberto(false);
              }}
            >
              Limpar sessão
            </Button>
          ) : null}
          <Button
            disabled={empresaId.length < 10}
            onClick={() => {
              definirSessao({
                empresaId,
                usuarioId: usuarioId || null,
                papel,
                nomeExibicao: nome || null,
                token: null,
              });
              setAberto(false);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
