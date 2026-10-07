import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return ["/", "/central-de-inteligencia", "/painel", "/sobre", "/informativos-tecnicos", "/noticias", "/fale-conosco", "/ipagro", "/sindicatos-rurais", "/comissao-mulheres", "/politica-de-privacidade"].map((caminho) => ({
    url: `${SITE_URL}${caminho}`,
    lastModified: agora,
    changeFrequency: caminho === "/" ? "daily" : "weekly",
    priority: caminho === "/" ? 1 : 0.8,
  }));
}
