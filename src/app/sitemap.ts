import type { MetadataRoute } from "next";

const BASE_URL = "https://orbitalrevestimentos.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/produtos`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/projetos`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/tecnologia`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/guias/mdf-manaus`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/guias/revestimento-banheiro-manaus`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/guias/revestimento-parede-manaus`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/guias/quanto-custa-revestimento-manaus`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.75,
    },
    {
      url: `${BASE_URL}/sobre`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.75,
    },
    {
      url: `${BASE_URL}/parcerias`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/simulador`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.65,
    },
  ];
}
