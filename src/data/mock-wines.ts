import { Wine } from '@/types';

export const mockWines: Wine[] = [
  {
    id: 'w1', name: 'Miolo Lote 43', year: '2021', type: 'Tinto', country: 'Brasil', region: 'Vale dos Vinhedos', producer: 'Miolo', grape: 'Merlot / Cabernet Sauvignon', price: 89.90, quantity: 24, minStock: 6, imageUrl: null, imageData: null, location: 'A1', createdAt: '2026-03-15T10:00:00Z',
    description: 'Blend elegante com notas de frutas vermelhas maduras, toque de baunilha e taninos macios.',
    pairingFood: ['Picanha na brasa', 'Costela assada', 'Queijo provolone', 'Massas com molho vermelho'],
  },
  {
    id: 'w2', name: 'Casa Valduga Raízes', year: '2020', type: 'Tinto', country: 'Brasil', region: 'Serra Gaúcha', producer: 'Casa Valduga', grape: 'Cabernet Sauvignon', price: 65.00, quantity: 18, minStock: 5, imageUrl: null, imageData: null, location: 'A3', createdAt: '2026-03-15T10:00:00Z',
    description: 'Cabernet clássico brasileiro com corpo médio, aromas de cassis e pimentão.',
    pairingFood: ['Hambúrguer artesanal', 'Linguiça toscana', 'Pizza de calabresa', 'Queijo coalho'],
  },
  {
    id: 'w3', name: 'Quinta do Crasto Reserva', year: '2019', type: 'Tinto', country: 'Portugal', region: 'Douro', producer: 'Quinta do Crasto', grape: 'Touriga Nacional', price: 210.00, quantity: 8, minStock: 4, imageUrl: null, imageData: null, location: 'B2', createdAt: '2026-03-20T10:00:00Z',
    description: 'Intenso e complexo, com notas de ameixa preta, violeta, chocolate e especiarias. Passagem por barrica de carvalho francês.',
    pairingFood: ['Cordeiro assado', 'Bacalhau à Brás', 'Queijos curados portugueses', 'Risoto de cogumelos'],
  },
  {
    id: 'w4', name: 'Catena Zapata Malbec', year: '2020', type: 'Tinto', country: 'Argentina', region: 'Mendoza', producer: 'Catena Zapata', grape: 'Malbec', price: 185.00, quantity: 12, minStock: 4, imageUrl: null, imageData: null, location: 'B5', createdAt: '2026-03-22T10:00:00Z',
    description: 'Malbec de altitude com fruta concentrada, notas florais e final persistente. Referência argentina.',
    pairingFood: ['Bife de chorizo', 'Empanadas', 'Queijo azul', 'Chocolate amargo 70%'],
  },
  {
    id: 'w5', name: 'Casillero del Diablo', year: '2022', type: 'Tinto', country: 'Chile', region: 'Valle Central', producer: 'Concha y Toro', grape: 'Carménère', price: 55.00, quantity: 30, minStock: 8, imageUrl: null, imageData: null, location: 'A6', createdAt: '2026-03-10T10:00:00Z',
    description: 'Frutado e acessível, com notas de frutas vermelhas e um toque de pimenta verde característico da Carménère.',
    pairingFood: ['Frango assado', 'Tacos', 'Bruschetta', 'Queijo brie'],
  },
  {
    id: 'w6', name: 'Château Margaux', year: '2015', type: 'Tinto', country: 'França', region: 'Bordeaux', producer: 'Château Margaux', grape: 'Cabernet Sauvignon / Merlot', price: 3200.00, quantity: 3, minStock: 2, imageUrl: null, imageData: null, location: 'H1', createdAt: '2026-02-15T10:00:00Z',
    description: 'Premier Grand Cru Classé. Elegância suprema com taninos de seda, notas de cassis, grafite e violeta. Potencial de guarda excepcional.',
    pairingFood: ['Filé mignon ao molho de trufas', 'Pato confitado', 'Queijo Comté envelhecido', 'Risoto de parmesão'],
  },
  {
    id: 'w7', name: 'Tignanello', year: '2018', type: 'Tinto', country: 'Itália', region: 'Toscana', producer: 'Antinori', grape: 'Sangiovese', price: 890.00, quantity: 6, minStock: 3, imageUrl: null, imageData: null, location: 'G2', createdAt: '2026-03-01T10:00:00Z',
    description: 'Super Toscano icônico. Sangiovese com Cabernet em perfeita harmonia, cereja madura, tabaco e couro.',
    pairingFood: ['Ossobuco', 'Lasanha bolonhesa', 'Bisteca alla fiorentina', 'Pecorino Toscano'],
  },
  {
    id: 'w8', name: 'Penfolds Bin 389', year: '2019', type: 'Tinto', country: 'Austrália', region: 'South Australia', producer: 'Penfolds', grape: 'Cabernet / Shiraz', price: 420.00, quantity: 5, minStock: 3, imageUrl: null, imageData: null, location: 'C4', createdAt: '2026-03-05T10:00:00Z',
    description: 'Conhecido como "Baby Grange". Encorpado com frutas negras, menta, chocolate e carvalho americano.',
    pairingFood: ['Costela de porco BBQ', 'Carne de sol', 'Queijo cheddar curado', 'Hambúrguer de costela'],
  },
  {
    id: 'w9', name: 'Cloudy Bay Sauvignon Blanc', year: '2023', type: 'Branco', country: 'Nova Zelândia', region: 'Marlborough', producer: 'Cloudy Bay', grape: 'Sauvignon Blanc', price: 195.00, quantity: 10, minStock: 4, imageUrl: null, imageData: null, location: 'D1', createdAt: '2026-04-01T10:00:00Z',
    description: 'Referência mundial em Sauvignon Blanc. Vibrante, com maracujá, lima e mineralidade cortante.',
    pairingFood: ['Ceviche', 'Salada caprese', 'Camarão grelhado', 'Queijo de cabra fresco'],
  },
  {
    id: 'w10', name: 'Dona Maria Branco', year: '2022', type: 'Branco', country: 'Portugal', region: 'Alentejo', producer: 'Júlio Bastos', grape: 'Arinto / Antão Vaz', price: 120.00, quantity: 14, minStock: 5, imageUrl: null, imageData: null, location: 'D3', createdAt: '2026-04-05T10:00:00Z',
    description: 'Fresco e aromático, com notas de pêssego, flores brancas e um toque mineral.',
    pairingFood: ['Bacalhau com natas', 'Arroz de marisco', 'Frango com ervas', 'Queijo Serra da Estrela'],
  },
  {
    id: 'w11', name: 'Salton Intenso Rosé', year: '2023', type: 'Rosé', country: 'Brasil', region: 'Serra Gaúcha', producer: 'Salton', grape: 'Merlot', price: 42.00, quantity: 20, minStock: 6, imageUrl: null, imageData: null, location: 'E1', createdAt: '2026-04-10T10:00:00Z',
    description: 'Rosé leve e refrescante, com aromas de morango e pétalas de rosa.',
    pairingFood: ['Sushi e sashimi', 'Salada mediterrânea', 'Quiche de alho-poró', 'Frutas frescas'],
  },
  {
    id: 'w12', name: 'Chandon Réserve Brut', year: '2022', type: 'Espumante', country: 'Brasil', region: 'Serra Gaúcha', producer: 'Chandon', grape: 'Chardonnay / Pinot Noir', price: 95.00, quantity: 15, minStock: 5, imageUrl: null, imageData: null, location: 'F1', createdAt: '2026-04-12T10:00:00Z',
    description: 'Espumante método tradicional, bolhas finas e persistentes, notas de maçã verde e brioche.',
    pairingFood: ['Ostras frescas', 'Canapés de salmão', 'Risoto de limão siciliano', 'Torta de maçã'],
  },
  {
    id: 'w13', name: 'Veuve Clicquot Brut', year: 'NV', type: 'Espumante', country: 'França', region: 'Champagne', producer: 'Veuve Clicquot', grape: 'Pinot Noir / Chardonnay', price: 650.00, quantity: 4, minStock: 3, imageUrl: null, imageData: null, location: 'F3', createdAt: '2026-03-25T10:00:00Z',
    description: 'Champagne icônico. Estruturado, com notas de biscoito, pera madura e brioche amanteigado.',
    pairingFood: ['Caviar', 'Lagosta grelhada', 'Foie gras', 'Tábua de queijos finos'],
  },
  {
    id: 'w14', name: "Graham's 20 Year Tawny", year: 'NV', type: 'Fortificado', country: 'Portugal', region: 'Porto', producer: "Graham's", grape: 'Blend Tradicional', price: 480.00, quantity: 3, minStock: 2, imageUrl: null, imageData: null, location: 'G5', createdAt: '2026-03-18T10:00:00Z',
    description: 'Porto Tawny envelhecido 20 anos. Caramelo, nozes, figo seco e especiarias. Final interminável.',
    pairingFood: ['Crème brûlée', 'Queijo Stilton', 'Nozes caramelizadas', 'Tarte de amêndoas'],
  },
  {
    id: 'w15', name: "Château d'Yquem", year: '2017', type: 'Sobremesa', country: 'França', region: 'Sauternes', producer: "Château d'Yquem", grape: 'Sémillon / Sauvignon Blanc', price: 2800.00, quantity: 2, minStock: 1, imageUrl: null, imageData: null, location: 'H3', createdAt: '2026-02-20T10:00:00Z',
    description: 'O maior vinho de sobremesa do mundo. Mel, damasco, açafrão e uma acidez que equilibra a doçura.',
    pairingFood: ['Foie gras mi-cuit', 'Roquefort', 'Tarte Tatin', 'Pêssegos assados com baunilha'],
  },
  {
    id: 'w16', name: 'Alamos Malbec', year: '2022', type: 'Tinto', country: 'Argentina', region: 'Mendoza', producer: 'Alamos', grape: 'Malbec', price: 72.00, quantity: 2, minStock: 8, imageUrl: null, imageData: null, location: 'B8', createdAt: '2026-04-15T10:00:00Z',
    description: 'Malbec jovem e frutado, acessível e versátil. Ameixa, cereja e um toque de baunilha.',
    pairingFood: ['Pizza margherita', 'Espetinhos de carne', 'Nachos com guacamole', 'Coxinha de frango'],
  },
  {
    id: 'w17', name: 'Mateus Rosé', year: '2023', type: 'Rosé', country: 'Portugal', region: 'Douro', producer: 'Sogrape', grape: 'Baga / Rufete', price: 38.00, quantity: 1, minStock: 5, imageUrl: null, imageData: null, location: 'E4', createdAt: '2026-04-18T10:00:00Z',
    description: 'Clássico português, levemente frisante, com morango e framboesa.',
    pairingFood: ['Salada de frango grelhado', 'Tapas variadas', 'Pastel de nata', 'Pratos asiáticos leves'],
  },
  {
    id: 'w18', name: 'Santa Helena Reservado', year: '2022', type: 'Branco', country: 'Chile', region: 'Valle Central', producer: 'Santa Helena', grape: 'Chardonnay', price: 35.00, quantity: 3, minStock: 6, imageUrl: null, imageData: null, location: 'D6', createdAt: '2026-04-20T10:00:00Z',
    description: 'Chardonnay frutado com abacaxi e toques tropicais. Leve passagem por carvalho.',
    pairingFood: ['Peixe grelhado', 'Frango ao curry suave', 'Massa ao pesto', 'Queijo minas frescal'],
  },
  {
    id: 'w19', name: 'Terrazas Reserva', year: '2021', type: 'Tinto', country: 'Argentina', region: 'Mendoza', producer: 'Terrazas de los Andes', grape: 'Cabernet Sauvignon', price: 98.00, quantity: 9, minStock: 4, imageUrl: null, imageData: null, location: 'C1', createdAt: '2026-05-01T10:00:00Z',
    description: 'Cabernet de altitude com estrutura firme, cassis, eucalipto e tabaco.',
    pairingFood: ['Entrecôte grelhado', 'Ragu de carne', 'Queijo gruyère', 'Berinjela à parmegiana'],
  },
  {
    id: 'w20', name: 'Periquita Reserva', year: '2020', type: 'Tinto', country: 'Portugal', region: 'Setúbal', producer: 'José Maria da Fonseca', grape: 'Castelão', price: 58.00, quantity: 16, minStock: 5, imageUrl: null, imageData: null, location: 'C7', createdAt: '2026-05-05T10:00:00Z',
    description: 'Clássico português acessível. Cereja, ameixa e ervas aromáticas com taninos suaves.',
    pairingFood: ['Leitão à Bairrada', 'Arroz de pato', 'Chouriço assado', 'Queijo de Azeitão'],
  },
];
