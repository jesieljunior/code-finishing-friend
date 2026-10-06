import { describe, expect, it } from "vitest";

import { calcularFatura, melhorPlano, pontoDeVirada, valorComRepasse } from "./cobranca-v2";

const start = { id: "s", nome: "Start", mensalidade: 299, participacoes_incluidas: 100, valor_excedente: 3 };
const pro = { id: "p", nome: "Pro", mensalidade: 499, participacoes_incluidas: 300, valor_excedente: 2.5 };
const scale = { id: "x", nome: "Scale", mensalidade: 899, participacoes_incluidas: 800, valor_excedente: 2 };

describe("cobrança V2", () => {
  it("cobra mensalidade + excedente", () => {
    expect(calcularFatura(pro, 420).total).toBe(799);
    expect(calcularFatura(pro, 120).total).toBe(499);
  });
  it("calcula ponto de virada", () => {
    expect(pontoDeVirada(start, pro)).toBe(167);
    expect(pontoDeVirada(pro, scale)).toBe(460);
  });
  it("escolhe o plano mais barato", () => {
    expect(melhorPlano([start, pro, scale], 150)?.id).toBe("s");
    expect(melhorPlano([start, pro, scale], 200)?.id).toBe("p");
  });
  it("repassa taxa por dentro", () => {
    expect(valorComRepasse(100, 0.0099).cobrado).toBe(101);
    expect(valorComRepasse(1000, 0.0498).cobrado).toBe(1052.41);
  });
});
