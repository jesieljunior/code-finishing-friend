export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          atualizado_em: string
          criado_em: string
          empresa_id: string
          id: string
          nome: string
          observacoes: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          empresa_id: string
          id?: string
          nome: string
          observacoes?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          empresa_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          atualizado_em: string
          checkin_exige_gps: boolean
          checkin_exige_selfie: boolean
          criado_em: string
          empresa_id: string
          escala_exige_confirmacao_presenca: boolean
          id: string
          ocorrencias_habilitadas: boolean
          substituicao_habilitada: boolean
        }
        Insert: {
          atualizado_em?: string
          checkin_exige_gps?: boolean
          checkin_exige_selfie?: boolean
          criado_em?: string
          empresa_id: string
          escala_exige_confirmacao_presenca?: boolean
          id?: string
          ocorrencias_habilitadas?: boolean
          substituicao_habilitada?: boolean
        }
        Update: {
          atualizado_em?: string
          checkin_exige_gps?: boolean
          checkin_exige_selfie?: boolean
          criado_em?: string
          empresa_id?: string
          escala_exige_confirmacao_presenca?: boolean
          id?: string
          ocorrencias_habilitadas?: boolean
          substituicao_habilitada?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativa: boolean
          atualizado_em: string
          cnpj: string
          criado_em: string
          id: string
          nome: string
          subconta_parceiro_id: string | null
        }
        Insert: {
          ativa?: boolean
          atualizado_em?: string
          cnpj: string
          criado_em?: string
          id?: string
          nome: string
          subconta_parceiro_id?: string | null
        }
        Update: {
          ativa?: boolean
          atualizado_em?: string
          cnpj?: string
          criado_em?: string
          id?: string
          nome?: string
          subconta_parceiro_id?: string | null
        }
        Relationships: []
      }
      equipes: {
        Row: {
          atualizado_em: string
          criado_em: string
          evento_id: string
          id: string
          nome: string
          supervisor_id: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          evento_id: string
          id?: string
          nome: string
          supervisor_id?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          evento_id?: string
          id?: string
          nome?: string
          supervisor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipes_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      escalas: {
        Row: {
          atualizado_em: string
          confirmado_em: string | null
          convite_enviado_em: string | null
          criado_em: string
          equipe_id: string
          freelancer_id: string
          id: string
          status: Database["public"]["Enums"]["status_escala"]
          substituido_por_id: string | null
          tipo_valor: Database["public"]["Enums"]["tipo_valor"]
          valor_combinado: number
        }
        Insert: {
          atualizado_em?: string
          confirmado_em?: string | null
          convite_enviado_em?: string | null
          criado_em?: string
          equipe_id: string
          freelancer_id: string
          id?: string
          status?: Database["public"]["Enums"]["status_escala"]
          substituido_por_id?: string | null
          tipo_valor: Database["public"]["Enums"]["tipo_valor"]
          valor_combinado: number
        }
        Update: {
          atualizado_em?: string
          confirmado_em?: string | null
          convite_enviado_em?: string | null
          criado_em?: string
          equipe_id?: string
          freelancer_id?: string
          id?: string
          status?: Database["public"]["Enums"]["status_escala"]
          substituido_por_id?: string | null
          tipo_valor?: Database["public"]["Enums"]["tipo_valor"]
          valor_combinado?: number
        }
        Relationships: [
          {
            foreignKeyName: "escalas_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_substituido_por_id_fkey"
            columns: ["substituido_por_id"]
            isOneToOne: false
            referencedRelation: "escalas"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          atualizado_em: string
          cliente_id: string | null
          criado_em: string
          data_fim: string | null
          data_inicio: string
          empresa_id: string
          id: string
          local: string | null
          nome: string
          qr_code_token: string
          status: Database["public"]["Enums"]["status_evento"]
        }
        Insert: {
          atualizado_em?: string
          cliente_id?: string | null
          criado_em?: string
          data_fim?: string | null
          data_inicio: string
          empresa_id: string
          id?: string
          local?: string | null
          nome: string
          qr_code_token?: string
          status?: Database["public"]["Enums"]["status_evento"]
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string | null
          criado_em?: string
          data_fim?: string | null
          data_inicio?: string
          empresa_id?: string
          id?: string
          local?: string | null
          nome?: string
          qr_code_token?: string
          status?: Database["public"]["Enums"]["status_evento"]
        }
        Relationships: [
          {
            foreignKeyName: "eventos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      fechamentos: {
        Row: {
          aprovado_em: string | null
          aprovado_por_id: string | null
          atualizado_em: string
          criado_em: string
          escala_id: string
          horas_trabalhadas: number
          id: string
          status: Database["public"]["Enums"]["status_fechamento"]
          valor_calculado: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por_id?: string | null
          atualizado_em?: string
          criado_em?: string
          escala_id: string
          horas_trabalhadas: number
          id?: string
          status?: Database["public"]["Enums"]["status_fechamento"]
          valor_calculado: number
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por_id?: string | null
          atualizado_em?: string
          criado_em?: string
          escala_id?: string
          horas_trabalhadas?: number
          id?: string
          status?: Database["public"]["Enums"]["status_fechamento"]
          valor_calculado?: number
        }
        Relationships: [
          {
            foreignKeyName: "fechamentos_aprovado_por_id_fkey"
            columns: ["aprovado_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fechamentos_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: true
            referencedRelation: "escalas"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancers: {
        Row: {
          ativo: boolean
          atualizado_em: string
          chave_pix: string
          cpf: string
          criado_em: string
          empresa_id: string
          funcao: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          chave_pix: string
          cpf: string
          criado_em?: string
          empresa_id: string
          funcao?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          chave_pix?: string
          cpf?: string
          criado_em?: string
          empresa_id?: string
          funcao?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freelancers_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias: {
        Row: {
          atualizado_em: string
          criado_em: string
          descricao: string
          escala_id: string
          id: string
          registrado_por_id: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          descricao: string
          escala_id: string
          id?: string
          registrado_por_id?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string
          escala_id?: string
          id?: string
          registrado_por_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "escalas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_registrado_por_id_fkey"
            columns: ["registrado_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          atualizado_em: string
          chave_idempotencia: string
          comprovante_url: string | null
          criado_em: string
          data_agendada: string | null
          erro: string | null
          executado_em: string | null
          fechamento_id: string
          id: string
          status: Database["public"]["Enums"]["status_pagamento"]
          tentativas: number
          txid_parceiro: string | null
          valor: number
        }
        Insert: {
          atualizado_em?: string
          chave_idempotencia: string
          comprovante_url?: string | null
          criado_em?: string
          data_agendada?: string | null
          erro?: string | null
          executado_em?: string | null
          fechamento_id: string
          id?: string
          status?: Database["public"]["Enums"]["status_pagamento"]
          tentativas?: number
          txid_parceiro?: string | null
          valor: number
        }
        Update: {
          atualizado_em?: string
          chave_idempotencia?: string
          comprovante_url?: string | null
          criado_em?: string
          data_agendada?: string | null
          erro?: string | null
          executado_em?: string | null
          fechamento_id?: string
          id?: string
          status?: Database["public"]["Enums"]["status_pagamento"]
          tentativas?: number
          txid_parceiro?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: true
            referencedRelation: "fechamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      pontos: {
        Row: {
          aprovado_em: string | null
          aprovado_por_id: string | null
          atualizado_em: string
          criado_em: string
          device_hash: string | null
          escala_id: string
          foto_url: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          metodo: Database["public"]["Enums"]["metodo_check"]
          registrado_em: string
          status: Database["public"]["Enums"]["status_ponto"]
          tipo: Database["public"]["Enums"]["tipo_ponto"]
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por_id?: string | null
          atualizado_em?: string
          criado_em?: string
          device_hash?: string | null
          escala_id: string
          foto_url?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          metodo: Database["public"]["Enums"]["metodo_check"]
          registrado_em?: string
          status?: Database["public"]["Enums"]["status_ponto"]
          tipo: Database["public"]["Enums"]["tipo_ponto"]
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por_id?: string | null
          atualizado_em?: string
          criado_em?: string
          device_hash?: string | null
          escala_id?: string
          foto_url?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_check"]
          registrado_em?: string
          status?: Database["public"]["Enums"]["status_ponto"]
          tipo?: Database["public"]["Enums"]["tipo_ponto"]
        }
        Relationships: [
          {
            foreignKeyName: "pontos_aprovado_por_id_fkey"
            columns: ["aprovado_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pontos_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "escalas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          criado_em: string
          id: string
          role: Database["public"]["Enums"]["papel_usuario"]
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          role: Database["public"]["Enums"]["papel_usuario"]
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          role?: Database["public"]["Enums"]["papel_usuario"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          email: string
          empresa_id: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          email?: string
          empresa_id?: string | null
          id: string
          nome?: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          email?: string
          empresa_id?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      criar_empresa: { Args: { _cnpj: string; _nome: string }; Returns: string }
      empresa_atual: { Args: never; Returns: string }
      empresa_da_equipe: { Args: { _equipe_id: string }; Returns: string }
      empresa_da_escala: { Args: { _escala_id: string }; Returns: string }
      empresa_do_fechamento: {
        Args: { _fechamento_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["papel_usuario"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      metodo_check: "qrcode" | "selfie" | "manual"
      papel_usuario: "admin" | "coordenador" | "financeiro" | "supervisor"
      status_escala: "convidado" | "confirmado" | "recusado" | "substituido"
      status_evento:
        | "planejamento"
        | "escala"
        | "confirmacoes"
        | "pronto"
        | "em_execucao"
        | "encerrando"
        | "fechamento"
        | "pagamento"
        | "concluido"
        | "arquivado"
        | "cancelado"
      status_fechamento: "pendente_aprovacao" | "aprovado" | "contestado"
      status_pagamento: "pendente" | "agendado" | "executado" | "falhou"
      status_ponto: "pendente" | "aprovado" | "recusado"
      tipo_ponto: "entrada" | "saida" | "inicio_intervalo" | "fim_intervalo"
      tipo_valor: "diaria" | "hora"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      metodo_check: ["qrcode", "selfie", "manual"],
      papel_usuario: ["admin", "coordenador", "financeiro", "supervisor"],
      status_escala: ["convidado", "confirmado", "recusado", "substituido"],
      status_evento: [
        "planejamento",
        "escala",
        "confirmacoes",
        "pronto",
        "em_execucao",
        "encerrando",
        "fechamento",
        "pagamento",
        "concluido",
        "arquivado",
        "cancelado",
      ],
      status_fechamento: ["pendente_aprovacao", "aprovado", "contestado"],
      status_pagamento: ["pendente", "agendado", "executado", "falhou"],
      status_ponto: ["pendente", "aprovado", "recusado"],
      tipo_ponto: ["entrada", "saida", "inicio_intervalo", "fim_intervalo"],
      tipo_valor: ["diaria", "hora"],
    },
  },
} as const
