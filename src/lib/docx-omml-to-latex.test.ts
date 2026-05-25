import { describe, expect, it } from "vitest";
import { ommlXmlToLatex } from "./docx-omml-to-latex";

const Q1_OMML = `<m:oMath><m:f><m:fPr><m:ctrlPr/></m:fPr><m:num><m:r><m:t>198</m:t></m:r></m:num><m:den><m:r><m:t>233</m:t></m:r></m:den></m:f><m:r><m:t>-</m:t></m:r><m:d><m:dPr/><m:e><m:f><m:fPr/><m:num><m:r><m:t>101</m:t></m:r></m:num><m:den><m:r><m:t>233</m:t></m:r></m:den></m:f><m:r><m:t>+</m:t></m:r><m:f><m:fPr/><m:num><m:r><m:t>87</m:t></m:r></m:num><m:den><m:r><m:t>233</m:t></m:r></m:den></m:f></m:e></m:d></m:oMath>`;

describe("ommlXmlToLatex", () => {
  it("converts fraction, minus, and parenthesized sum", () => {
    const latex = ommlXmlToLatex(Q1_OMML);
    expect(latex).toContain("\\frac{198}{233}");
    expect(latex).toContain("\\left(");
    expect(latex).toContain("\\frac{101}{233}");
    expect(latex).toContain("+");
    expect(latex).toContain("\\frac{87}{233}");
  });

  it("converts mixed number (whole + fraction)", () => {
    const omml = `<m:oMath><m:r><m:t>5</m:t></m:r><m:f><m:fPr/><m:num><m:r><m:t>11</m:t></m:r></m:num><m:den><m:r><m:t>21</m:t></m:r></m:den></m:f></m:oMath>`;
    expect(ommlXmlToLatex(omml)).toBe("5 \\frac{11}{21}");
  });
});
