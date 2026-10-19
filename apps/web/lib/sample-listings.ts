import type { CardFeature } from "@/components/ListingCardCompact";

/** Datos de ejemplo para el home; el catálogo real vive en MongoDB. */

export type SampleListing = {
  slug: string;
  image: string;
  imageAlt: string;
  price: string;
  title: string;
  location: string;
  features: CardFeature[];
  tag?: string;
  agent: string;
};

export const featuredListings: SampleListing[] = [
  {
    slug: "casa-contemporanea-lomas-angelopolis",
    image: "/images/property1.webp",
    imageAlt: "Casa contemporánea iluminada con alberca",
    price: "$1,250,000",
    title: "Casa Contemporánea en Lomas de Angelópolis",
    location: "Lomas de Angelópolis, Puebla, Pue.",
    features: [
      { icon: "i-bed", label: "4 Habs" },
      { icon: "i-bath", label: "4.5 Baños" },
      { icon: "i-ruler", label: "450 m²" },
    ],
    agent: "Ana G. (Agente)",
  },
  {
    slug: "departamento-panoramico-angelopolis",
    image: "/images/property2.webp",
    imageAlt: "Departamento con vista panorámica a la ciudad",
    price: "$850,000",
    title: "Departamento Panorámico en Angelópolis",
    location: "Angelópolis, Puebla, Pue.",
    features: [
      { icon: "i-bed", label: "2 Habs" },
      { icon: "i-bath", label: "2 Baños" },
      { icon: "i-ruler", label: "120 m²" },
    ],
    agent: "Ana G. (Agente)",
  },
];

export const compactListings: SampleListing[] = [
  {
    slug: "casa-minimalista-la-vista",
    image: "/images/property3.webp",
    imageAlt: "Cocina minimalista de una casa",
    price: "$420,000",
    title: "Casa Minimalista en La Vista",
    location: "La Vista, Puebla, Pue.",
    features: [
      { icon: "i-bed", label: "3" },
      { icon: "i-ruler", label: "210 m²" },
    ],
    agent: "Ana G. (Agente)",
  },
  {
    slug: "terreno-baldio-cholula",
    image: "/images/property4.webp",
    imageAlt: "Terreno baldío con acceso a camino",
    price: "$180,000",
    title: "Terreno Baldío en Cholula",
    location: "San Pedro Cholula, Pue.",
    features: [{ icon: "i-ruler", label: "600 m²" }],
    tag: "Terreno",
    agent: "Ana G. (Agente)",
  },
  {
    slug: "casa-vista-club",
    image: "/images/property5.webp",
    imageAlt: "Casa con terraza y alberca al atardecer",
    price: "$2,100,000",
    title: "Casa con Vista al Club",
    location: "Club de Golf, Puebla, Pue.",
    features: [
      { icon: "i-bed", label: "5" },
      { icon: "i-ruler", label: "850 m²" },
    ],
    agent: "Ana G. (Agente)",
  },
  {
    slug: "departamento-boutique-centro",
    image: "/images/property6.webp",
    imageAlt: "Fachada de departamento boutique de concreto y madera",
    price: "$350,000",
    title: "Departamento Boutique en el Centro",
    location: "Centro Histórico, Puebla, Pue.",
    features: [
      { icon: "i-bed", label: "1" },
      { icon: "i-ruler", label: "85 m²" },
    ],
    agent: "Ana G. (Agente)",
  },
  {
    slug: "casa-familiar-san-manuel",
    image: "/images/property1.webp",
    imageAlt: "Casa de dos pisos con jardín",
    price: "$640,000",
    title: "Casa Familiar en San Manuel",
    location: "San Manuel, Puebla, Pue.",
    features: [
      { icon: "i-bed", label: "4" },
      { icon: "i-ruler", label: "320 m²" },
    ],
    agent: "Ana G. (Agente)",
  },
  {
    slug: "departamento-zavaleta",
    image: "/images/property2.webp",
    imageAlt: "Departamento luminoso con balcón",
    price: "$295,000",
    title: "Departamento en Zavaleta",
    location: "Zavaleta, Puebla, Pue.",
    features: [
      { icon: "i-bed", label: "2" },
      { icon: "i-ruler", label: "95 m²" },
    ],
    agent: "Ana G. (Agente)",
  },
  {
    slug: "casa-campo-atlixco",
    image: "/images/property3.webp",
    imageAlt: "Interior de casa de campo",
    price: "$510,000",
    title: "Casa de Campo en Atlixco",
    location: "Atlixco, Pue.",
    features: [
      { icon: "i-bed", label: "3" },
      { icon: "i-ruler", label: "1,200 m²" },
    ],
    agent: "Ana G. (Agente)",
  },
  {
    slug: "terreno-baldio-cuautlancingo",
    image: "/images/property4.webp",
    imageAlt: "Terreno baldío plano con acceso a camino",
    price: "$97,000",
    title: "Terreno Baldío en Cuautlancingo",
    location: "Cuautlancingo, Pue.",
    features: [{ icon: "i-ruler", label: "400 m²" }],
    tag: "Terreno",
    agent: "Ana G. (Agente)",
  },
  {
    slug: "departamento-penthouse-angelopolis",
    image: "/images/property5.webp",
    imageAlt: "Penthouse con terraza",
    price: "$1,780,000",
    title: "Departamento Penthouse en Angelópolis",
    location: "Angelópolis, Puebla, Pue.",
    features: [
      { icon: "i-bed", label: "3" },
      { icon: "i-ruler", label: "280 m²" },
    ],
    agent: "Ana G. (Agente)",
  },
  {
    slug: "casa-esquina-mayorazgo",
    image: "/images/property6.webp",
    imageAlt: "Casa en esquina con fachada blanca",
    price: "$389,000",
    title: "Casa de Esquina en Mayorazgo",
    location: "Mayorazgo, Puebla, Pue.",
    features: [
      { icon: "i-bed", label: "3" },
      { icon: "i-ruler", label: "180 m²" },
    ],
    agent: "Ana G. (Agente)",
  },
  {
    slug: "casa-familiar-la-paz",
    image: "/images/property1.webp",
    imageAlt: "Residencia con alberca al frente",
    price: "$920,000",
    title: "Casa Familiar en La Paz",
    location: "La Paz, Puebla, Pue.",
    features: [
      { icon: "i-bed", label: "4" },
      { icon: "i-ruler", label: "520 m²" },
    ],
    agent: "Ana G. (Agente)",
  },
  {
    slug: "departamento-estudio-cholula",
    image: "/images/property2.webp",
    imageAlt: "Estudio pequeño amueblado",
    price: "$165,000",
    title: "Departamento Estudio en Cholula",
    location: "San Andrés Cholula, Pue.",
    features: [
      { icon: "i-bed", label: "1" },
      { icon: "i-ruler", label: "48 m²" },
    ],
    agent: "Ana G. (Agente)",
  },
];

/** Publicación de detalle de ejemplo (Casa Lumina, replicada del legacy). */
export const sampleListingDetail = {
  slug: "casa-lumina",
  title: "Casa Lumina, Moderna y Acogedora",
  operation: "En venta",
  publishedAt: "Publicado hace 3 días",
  address: "Av. Principal 123, Valle Oriente, San Pedro Garza García, N.L.",
  gallery: [
    { src: "/images/listing-placeholder.webp", alt: "Fachada de Casa Lumina al atardecer" },
    { src: "/images/listing-placeholder1.webp", alt: "Sala principal de Casa Lumina" },
    { src: "/images/listing-placeholder2.webp", alt: "Cocina y comedor de Casa Lumina" },
  ],
  features: [
    { icon: "i-bed" as const, value: "3", label: "Habitaciones" },
    { icon: "i-bath" as const, value: "2", label: "Baños" },
    { icon: "i-garage" as const, value: "1", label: "Cochera" },
    { icon: "i-ruler" as const, value: "400", label: "m² de construcción" },
  ],
  about: [
    "Casa Lumina se levanta sobre una de las lomas más altas del valle y aprovecha esa posición en cada habitación: los muros de cristal corredizo abren la planta baja hacia la terraza y borran el límite entre el interior y el jardín.",
    "El nivel principal ofrece techos de cuatro metros, una sala y comedor de concepto abierto y una cocina con isla de mármol, alacena independiente y electrodomésticos de línea profesional. La iluminación es natural durante casi todo el día gracias a la orientación poniente.",
    "La recámara principal funciona como una suite privada, con terraza envolvente, vestidor y un baño con tina exenta frente a la vista de la ciudad. La propiedad incluye además sala de cine, cava climatizada, alberca desbordante y cocina exterior completamente equipada.",
  ],
  amenities: [
    { icon: "i-pool" as const, label: "Alberca desbordante" },
    { icon: "i-air" as const, label: "Aire acondicionado central" },
    { icon: "i-flame" as const, label: "Chimeneas en sala y recámara" },
    { icon: "i-wine" as const, label: "Cava climatizada" },
    { icon: "i-smart-home" as const, label: "Sistema de casa inteligente" },
    { icon: "i-shield" as const, label: "Acceso controlado y vigilancia" },
  ],
  mapEmbed:
    "https://www.openstreetmap.org/export/embed?bbox=-98.21000039577486%2C19.00264828811257%2C-98.20310175418854%2C19.0066501080739&amp;layer=mapnik",
  owner: {
    name: "Alejandro Pierce",
    role: "Propietario verificado",
    phone: "(81) 1234-5678",
    phoneHref: "tel:+528112345678",
  },
};
