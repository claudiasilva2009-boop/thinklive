import { ArtCultureItem, ArtCultureTheme } from '../src/types/thinklive';

export const ART_CULTURE_THEMES: ArtCultureTheme[] = [
  'Obras de arte famosas',
  'Pinturas e ilustrações',
  'Fotografias artísticas',
  'Literatura e domínio público',
  'Curiosidades sobre artistas',
  'História da arte',
  'Movimentos artísticos',
  'Cinema e fotografia',
  'Arquitetura',
  'Exposições e manifestações',
  'Textos reflexivos',
];

function aicProxyUrl(imageId: string): string {
  return `/api/art-culture/image?imageId=${encodeURIComponent(imageId)}`;
}

// Curated Portuguese museum, art-history, architecture, cinema & public-domain literature archive
// Every artwork uses verified Art Institute of Chicago CC0 Public Domain records or local Thinklive assets.
const CURATED_ARCHIVE: ArtCultureItem[] = [
  {
    id: 'art_cur_vangogh_bedroom',
    theme: 'Obras de arte famosas',
    title: 'O Quarto em Arles (The Bedroom)',
    artistOrAuthor: 'Vincent van Gogh',
    year: '1889',
    mediumOrOrigin: 'Óleo sobre tela · 73,6 × 92,3 cm',
    imageUrl: aicProxyUrl('6644829f-f292-c5c4-a73c-0356a6fdbf0d'),
    sourceName: 'Art Institute of Chicago',
    sourceUrl: 'https://www.artic.edu/artworks/28560',
    license: 'Domínio Público (CC0)',
    movementOrContext: 'Pós-Impressionismo',
    summary:
      'Pintada enquanto Van Gogh buscava serenidade no sul da França, a composição transforma móveis simples de madeira em refúgio emocional através de cores complementares vibrantes.',
    curiosityOrExcerpt:
      'Curiosidade: Van Gogh pintou três versões quase idênticas deste quarto. As paredes originalmente possuíam um tom lilás mais intenso que, com a ação da luz ao longo de um século, adquiriu o azul celeste suave que vemos hoje.',
  },
  {
    id: 'art_cur_monet_waterlilies',
    theme: 'Pinturas e ilustrações',
    title: 'Ninfeias (Water Lilies)',
    artistOrAuthor: 'Claude Monet',
    year: '1906',
    mediumOrOrigin: 'Óleo sobre tela · 89,9 × 94,1 cm',
    imageUrl: aicProxyUrl('3c27b499-af56-f0d5-93b5-a7f2f1ad5813'),
    sourceName: 'Art Institute of Chicago',
    sourceUrl: 'https://www.artic.edu/artworks/16568',
    license: 'Domínio Público (CC0)',
    movementOrContext: 'Impressionismo',
    summary:
      'Sem linha do horizonte definida, o lago de Giverny funde céu, água e reflexos botânicos em pinceladas livres que antecipam a abstração moderna.',
    curiosityOrExcerpt:
      'Na última década de vida, mesmo com catarata avançada, Monet dedicou-se obsessivamente às variações da luz sobre a superfície da água, registrando horas diferentes do mesmo dia.',
  },
  {
    id: 'art_cur_hokusai_wave',
    theme: 'Movimentos artísticos',
    title: 'Sob a Onda ao Largo de Kanagawa (A Grande Onda)',
    artistOrAuthor: 'Katsushika Hokusai',
    year: '1830–1833',
    mediumOrOrigin: 'Xilogravura colorida (ukiyo-e) em papel',
    imageUrl: aicProxyUrl('b3974542-b9b4-7568-fc4b-966738f61d78'),
    sourceName: 'Art Institute of Chicago',
    sourceUrl: 'https://www.artic.edu/artworks/24645',
    license: 'Domínio Público (CC0)',
    movementOrContext: 'Ukiyo-e · Xilogravura Japonesa',
    summary:
      'Da série "Trinta e Seis Vistas do Monte Fuji", esta gravura combina o azul da Prússia importado da Europa com a maestria japonesa da perspectiva assimétrica.',
    curiosityOrExcerpt:
      'Hokusai produziu esta obra-prima aos 70 anos de idade. Suas gravuras ukiyo-e influenciaram profundamente impressionistas e pós-impressionistas como Degas, Monet e Van Gogh.',
  },
  {
    id: 'art_cur_seurat_jatte',
    theme: 'História da arte',
    title: 'Tarde de Domingo na Ilha de Grande Jatte',
    artistOrAuthor: 'Georges Seurat',
    year: '1884–1886',
    mediumOrOrigin: 'Óleo sobre tela · 207,5 × 308,1 cm',
    imageUrl: aicProxyUrl('2d484387-2509-5e8e-2c43-22f9981972eb'),
    sourceName: 'Art Institute of Chicago',
    sourceUrl: 'https://www.artic.edu/artworks/27992',
    license: 'Domínio Público (CC0)',
    movementOrContext: 'Neoimpressionismo · Pontilhismo',
    summary:
      'Marco fundador do pontilhismo: milhares de pequenos pontos de cor pura justapostos para que o olho do observador misture opticamente a luminosidade à distância.',
    curiosityOrExcerpt:
      'Seurat realizou mais de sessenta estudos preliminares ao ar livre antes de trabalhar por dois anos na tela monumental dentro do ateliê, chegando a criar a moldura pintada ao redor da cena.',
  },
  {
    id: 'art_cur_degas_cassatt',
    theme: 'Curiosidades sobre artistas',
    title: 'Mary Cassatt na Galeria de Pinturas do Louvre',
    artistOrAuthor: 'Edgar Degas',
    year: '1879–1880',
    mediumOrOrigin: 'Água-forte, água-tinta e ponta-seca sobre papel',
    imageUrl: aicProxyUrl('a966261c-5ea8-120a-3c65-f7fd6d17df2a'),
    sourceName: 'Art Institute of Chicago',
    sourceUrl: 'https://www.artic.edu/artworks/76002',
    license: 'Domínio Público (CC0)',
    movementOrContext: 'Impressionismo · Gravura',
    summary:
      'Degas retrata de costas sua grande interlocutora artística, a pintora norte-americana Mary Cassatt, observando obras clássicas no Museu do Louvre.',
    curiosityOrExcerpt:
      'Curiosidade sobre artistas: Foi Mary Cassatt quem introduziu inúmeros colecionadores norte-americanos ao Impressionismo francês, tornando possível que acervos públicos hoje preservem tantas obras da vanguarda parisiense.',
  },
  {
    id: 'art_cur_stieglitz_photo',
    theme: 'Fotografias artísticas',
    title: 'Estudo Fotográfico em Gelatina de Prata',
    artistOrAuthor: 'Alfred Stieglitz',
    year: '1918',
    mediumOrOrigin: 'Impressão em gelatina de prata / platina',
    imageUrl: aicProxyUrl('4d9dcaa1-5a21-5596-5b60-b3808492d443'),
    sourceName: 'Art Institute of Chicago',
    sourceUrl: 'https://www.artic.edu/artworks/66489',
    license: 'Domínio Público (CC0)',
    movementOrContext: 'Fotografia Modernista',
    summary:
      'Um dos pioneiros na defesa da fotografia como arte autônoma nos museus, Stieglitz explorava luz natural, contraste tátil e enquadramentos íntimos sem retoques pictóricos.',
    curiosityOrExcerpt:
      'Em 1902, Stieglitz fundou o movimento Photo-Secession e a revista Camera Work, convencendo curadores de museus de que a câmera podia expressar poesia visual própria.',
  },
  {
    id: 'art_cur_lit_machado',
    theme: 'Literatura e domínio público',
    title: 'Dom Casmurro — A Memória e o Silêncio das Tardes',
    artistOrAuthor: 'Machado de Assis (1839–1908)',
    year: '1899',
    mediumOrOrigin: 'Romance brasileiro · Domínio Público',
    imageUrl: '/src/assets/images/book_archive_cover_1794860653200.jpg',
    sourceName: 'Biblioteca Nacional / Domínio Público',
    sourceUrl: 'http://www.dominiopublico.gov.br/',
    license: 'Domínio Público',
    movementOrContext: 'Realismo Brasileiro',
    summary:
      'Trecho original em domínio público da obra-prima de Machado de Assis, onde arquitetura doméstica e lembrança afetiva constroem o retrato do narrador.',
    curiosityOrExcerpt:
      '“O meu fim evidente era atar as duas pontas da vida, e restaurar na velhice a adolescência. Pois, senhor, não consegui recompor o que foi nem o que fui. Em tudo, se o rosto é igual, a fisionomia é diferente. Se só me faltassem os outros, vá; um homem consola-se mais ou menos das pessoas que perde; mais falto eu mesmo, e esta lacuna é tudo.”',
  },
  {
    id: 'art_cur_lit_pessoa',
    theme: 'Literatura e domínio público',
    title: 'Autopsicografia e a Arte de Sentir por Escrito',
    artistOrAuthor: 'Fernando Pessoa (1888–1935)',
    year: '1931',
    mediumOrOrigin: 'Poesia em língua portuguesa · Domínio Público',
    imageUrl: '/src/assets/images/poetry_botanical_cover_1794860652045.jpg',
    sourceName: 'Arquivo Pessoa · Domínio Público',
    sourceUrl: 'http://arquivopessoa.net/',
    license: 'Domínio Público',
    movementOrContext: 'Modernismo Português',
    summary:
      'Poema célebre de Fernando Pessoa sobre a transmutação estética da experiência pessoal em linguagem poética universal.',
    curiosityOrExcerpt:
      '“O poeta é um fingidor. / Finge tão completamente / Que chega a fingir que é dor / A dor que deveras sente. // E os que lêem o que escreve, / Na dor lida sentem bem, / Não as duas que ele teve, / Mas só a que eles não têm.”',
  },
  {
    id: 'art_cur_cinema_photo',
    theme: 'Cinema e fotografia',
    title: 'Da Câmara Escura ao Plano-Sequência Contemporâneo',
    artistOrAuthor: 'Ensaio Editorial Thinklive',
    year: '1895–2026',
    mediumOrOrigin: 'História da linguagem visual · 35mm e Cinema de Autor',
    imageUrl: '/src/assets/images/editorial_cinema_cover_1794860652401.jpg',
    sourceName: 'Acervo Editorial Thinklive',
    sourceUrl: 'https://www.artic.edu/collection',
    license: 'Conteúdo Editorial Original Thinklive',
    movementOrContext: 'Cinema e Fotografia de Rua',
    summary:
      'Como o enquadramento fotográfico em 35mm moldou a composição contemplativa de diretores como Wim Wenders, Agnès Varda e Abbas Kiarostami.',
    curiosityOrExcerpt:
      'Antes de filmar uma cena, diversos diretores realizam diários fotográficos em locação para estudar a temperatura da luz natural em diferentes horários — transformando a paciência da fotografia em ritmo cinematográfico.',
  },
  {
    id: 'art_cur_arquitetura_luz',
    theme: 'Arquitetura',
    title: 'A Luz Natural como Material Arquitetônico',
    artistOrAuthor: 'Caderno de Arquitetura & Espaço',
    year: 'Século XX–XXI',
    mediumOrOrigin: 'Arquitetura moderna e brutalismo poético',
    imageUrl: '/src/assets/images/autumn_library_hero_1794870054293.jpg',
    sourceName: 'Thinklive · Acervo Cultural',
    sourceUrl: 'https://www.artic.edu/departments/architecture-and-design',
    license: 'Conteúdo Editorial Original Thinklive',
    movementOrContext: 'Arquitetura Moderna Brasileira e Internacional',
    summary:
      'Do pátio de Lina Bo Bardi no MASP às bibliotecas banhadas por claraboias de Alvar Aalto: quando a arquitetura desenha a trajetória do sol dentro da sala de leitura.',
    curiosityOrExcerpt:
      'Em bibliotecas projetadas com iluminação zenital difusa, o objetivo não é apenas iluminar a página do livro, mas reduzir o ofuscamento e criar uma sensação de acolhimento que convida à permanência.',
  },
  {
    id: 'art_cur_exposicoes',
    theme: 'Exposições e manifestações',
    title: 'Salões Independentes, Bienais e Galerias de Bairro',
    artistOrAuthor: 'Guia de Manifestações Culturais',
    year: 'Panorama Cultural',
    mediumOrOrigin: 'Mostras públicas, fotoclubes e feiras de livros impressos',
    imageUrl: '/src/assets/images/street_photography_demo_1794860653458.jpg',
    sourceName: 'Thinklive · Guia Cultural',
    sourceUrl: 'https://www.artic.edu/exhibitions',
    license: 'Conteúdo Editorial Original Thinklive',
    movementOrContext: 'Circuito de Arte e Cultura Viva',
    summary:
      'Como pequenas livrarias, cineclubes universitários e acervos digitais abertos aproximam exposições antes restritas às grandes capitais.',
    curiosityOrExcerpt:
      'Hoje, museus como o Art Institute of Chicago, o Rijksmuseum e o Met mantêm centenas de milhares de obras digitalizadas em alta resolução sob licença CC0, permitindo a qualquer leitor montar sua própria exposição pessoal.',
  },
  {
    id: 'art_cur_reflexivo',
    theme: 'Textos reflexivos',
    title: 'Por que ainda precisamos olhar quadros sem pressa',
    artistOrAuthor: 'Redação Thinklive',
    year: '2026',
    mediumOrOrigin: 'Ensaio breve sobre atenção estética',
    imageUrl: '/src/assets/images/autumn_poetry_notebook_1794870054621.jpg',
    sourceName: 'Caderno de Reflexões Thinklive',
    sourceUrl: 'https://www.artic.edu/',
    license: 'Conteúdo Editorial Original Thinklive',
    movementOrContext: 'Estética do Cotidiano',
    summary:
      'Estudos em museus apontam que visitantes observam uma pintura por menos de vinte segundos. Dedicar três minutos silenciosos a uma única obra revela histórias inteiras escondidas nos cantos da tela.',
    curiosityOrExcerpt:
      'Experimente escolher uma pintura nesta galeria e anotar três detalhes que você só notou depois do primeiro minuto de observação: um gesto de mão, a direção da sombra ou um objeto esquecido na mesa.',
  },
];

let cachedArtItems: { timestamp: number; items: ArtCultureItem[] } | null = null;
const ART_CACHE_TTL_MS = 30 * 60 * 1000;

interface AicArtworkRaw {
  id: number;
  title: string;
  artist_display?: string;
  date_display?: string;
  medium_display?: string;
  classification_title?: string;
  style_title?: string;
  image_id?: string;
}

async function fetchAicByQuery(
  query: string,
  theme: ArtCultureTheme,
  limit = 2
): Promise<ArtCultureItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const url = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(
      query
    )}&query[term][is_public_domain]=true&fields=id,title,artist_display,date_display,medium_display,classification_title,style_title,image_id&limit=${limit}`;
    const res = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: AicArtworkRaw[] };
    return (data.data || [])
      .filter((a) => Boolean(a.image_id))
      .map((a) => ({
        id: `aic_${a.id}`,
        theme,
        title: a.title || 'Obra de Acervo',
        artistOrAuthor: (a.artist_display || 'Autor desconhecido').replace(/\n/g, ' · '),
        year: a.date_display || 'Acervo Histórico',
        mediumOrOrigin: a.medium_display || a.classification_title || 'Acervo museológico',
        imageUrl: aicProxyUrl(a.image_id!),
        sourceName: 'Art Institute of Chicago (Acervo Aberto)',
        sourceUrl: `https://www.artic.edu/artworks/${a.id}`,
        license: 'Domínio Público (CC0)',
        movementOrContext: a.style_title || a.classification_title || theme,
        summary: `${a.title} integra a coleção digital em domínio público do Art Institute of Chicago${
          a.medium_display ? `, realizada em ${a.medium_display.toLowerCase()}` : ''
        }.`,
        curiosityOrExcerpt: `Registro oficial nº ${a.id} disponibilizado em acesso aberto CC0 para estudo, fruição estética e pesquisa histórica na Thinklive.`,
      }));
  } catch {
    return [];
  }
}

export async function getArtCultureCatalog(): Promise<ArtCultureItem[]> {
  if (cachedArtItems && Date.now() - cachedArtItems.timestamp < ART_CACHE_TTL_MS) {
    return cachedArtItems.items;
  }

  const liveBatches = await Promise.all([
    fetchAicByQuery('Claude Monet landscape', 'Pinturas e ilustrações', 2),
    fetchAicByQuery('Alfred Stieglitz Walker Evans photography', 'Fotografias artísticas', 3),
    fetchAicByQuery('architectural drawing blueprint facade', 'Arquitetura', 2),
    fetchAicByQuery('Renaissance sculpture bronze marble', 'História da arte', 2),
    fetchAicByQuery('Surrealism Dadaism modernist', 'Movimentos artísticos', 2),
  ]);

  const seenIds = new Set<string>(CURATED_ARCHIVE.map((c) => c.id));
  const combined: ArtCultureItem[] = [...CURATED_ARCHIVE];

  for (const item of liveBatches.flat()) {
    if (seenIds.has(item.id)) continue;
    // Also skip duplicates with already curated AIC IDs
    const aicNum = item.id.replace('aic_', '');
    if (CURATED_ARCHIVE.some((c) => c.sourceUrl.endsWith(`/${aicNum}`))) continue;
    seenIds.add(item.id);
    combined.push(item);
  }

  cachedArtItems = {
    timestamp: Date.now(),
    items: combined,
  };
  return combined;
}
