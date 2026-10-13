export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: "PEN";
  emoji: string;
  /** category_id según catálogo de Mercado Pago (mejora tasa de aprobación) */
  categoryId: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "prod_camiseta",
    name: "Camiseta Premium",
    description: "Camiseta 100% algodón premium",
    price: 59,
    currency: "PEN",
    emoji: "👕",
    categoryId: "fashion",
  },
  {
    id: "prod_taza",
    name: "Taza Cerámica",
    description: "Taza cerámica artesanal 350 ml",
    price: 25,
    currency: "PEN",
    emoji: "☕",
    categoryId: "home_appliances",
  },
  {
    id: "prod_mochila",
    name: "Mochila Viajera",
    description: "Mochila resistente al agua 30 L",
    price: 149,
    currency: "PEN",
    emoji: "🎒",
    categoryId: "fashion",
  },
];

export function getProductById(id: string): Product | null {
  return PRODUCTS.find((p) => p.id === id) ?? null;
}
