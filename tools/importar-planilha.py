"""Gera o SQL que importa a planilha de vinhos de um cliente para o Supabase.

Uso:
  python3 -I tools/importar-planilha.py PLANILHA.xlsx EMAIL_DO_CLIENTE \
      --fileiras 8 --colunas 12 > supabase/import/cliente.sql

Com --fileiras 0 só os vinhos são importados; a grade sai depois por
supabase/admin/criar-grade.sql.

O SQL resultante é colado no SQL Editor do Supabase. Ele procura o usuário
pelo e-mail, então a conta do cliente precisa existir antes.

Formato esperado da planilha (tabela de preços "Finos"):
  - linha só com o nome do país em A abre uma seção (ARGENTINA, CHILE, ...)
  - A = nome, B = uva(s), C = safra, D = preço "De", N = preço "Por", O = nº sem significado conhecido

A saída contém dados do cliente: NUNCA commitar (supabase/import/ está no .gitignore).
Só usa a biblioteca padrão do Python, para rodar sem instalar nada.
"""
import argparse
import re
import sys
import unicodedata
import zipfile
import xml.etree.ElementTree as ET

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

PAISES = {
    'ARGENTINA': 'Argentina', 'ITALIA': 'Itália', 'ESPANHA': 'Espanha', 'CHILE': 'Chile',
    'PORTUGAL': 'Portugal', 'ESTADOS UNIDOS': 'Estados Unidos', 'GRECIA': 'Grécia',
    'HUNGRIA': 'Hungria', 'FRANCA': 'França', 'BRASIL': 'Brasil', 'URUGUAI': 'Uruguai',
    'ISRAEL': 'Israel', 'LIBANO': 'Líbano', 'NOVAZELANDIA': 'Nova Zelândia',
    'NOVA ZELANDIA': 'Nova Zelândia', 'MARROCOS': 'Marrocos', 'AUSTRALIA': 'Austrália',
    'AFRICA DO SUL': 'África do Sul',
}

# Erros de digitação recorrentes na coluna de uvas
UVAS = {
    'syrha': 'Syrah', 'tanat': 'Tannat', 'carnenere': 'Carmenere', 'tpuriga franca': 'Touriga Franca',
    'ancelota': 'Ancellotta', 'game': 'Gamay', 'cabernet sauvignon': 'Cabernet Sauvignon',
    'zinfandel': 'Zinfandel',
}

# Textos da coluna B que não são uvas
UVA_INVALIDA = re.compile(r'mostro|agiorgitiko 2023', re.I)


def sem_acento(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


def ler_celulas(caminho):
    z = zipfile.ZipFile(caminho)
    textos = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
            textos.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
    linhas = []
    for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).iter('{%s}row' % NS['m']):
        celulas = {}
        for c in row.findall('m:c', NS):
            v = c.find('m:v', NS)
            if v is None:
                continue
            col = re.sub(r'[0-9]', '', c.get('r'))
            celulas[col] = textos[int(v.text)] if c.get('t') == 's' else v.text
        linhas.append((int(row.get('r')), celulas))
    return linhas


def limpar(s):
    return re.sub(r'\s+', ' ', (s or '')).strip()


def numero(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def uvas(s):
    s = limpar(s).replace('.', ',').replace('/', ',')
    if not s or UVA_INVALIDA.search(s):
        return ''
    partes = [limpar(p) for p in s.split(',') if limpar(p)]
    return ', '.join(UVAS.get(p.lower(), p) for p in partes)


def vinhos(linhas):
    pais = None
    vistos = {}
    for n, c in linhas:
        nome = limpar(c.get('A'))
        if not nome:
            continue
        chave_pais = sem_acento(nome).upper()
        if chave_pais in PAISES and not c.get('N'):
            pais = PAISES[chave_pais]
            continue
        if n < 5:  # data e cabeçalho
            continue
        safra = limpar(c.get('C'))
        safra = str(int(float(safra))) if numero(safra) else ''
        uva = uvas(c.get('B'))
        chave = (nome.upper(), uva, safra)
        if chave in vistos:  # linha repetida = mais uma garrafa
            vistos[chave]['quantity'] += 1
            continue
        nota = [f'linha {n} da planilha']
        if numero(c.get('D')):
            nota.append(f'preço De: {c["D"]}')
        if limpar(c.get('O')):
            nota.append(f'coluna O: {c["O"]}')
        if limpar(c.get('B')) and not uva:
            nota.append(f'coluna B original: {limpar(c["B"])}')
        vistos[chave] = {
            'name': nome, 'year': safra, 'country': pais or '', 'grape': uva,
            'price': numero(c.get('N')) or 0, 'quantity': 1, 'source_note': '; '.join(nota),
        }
    return list(vistos.values())


def sql_str(s):
    return "'" + str(s).replace("'", "''") + "'"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('planilha')
    ap.add_argument('email')
    ap.add_argument('--fileiras', type=int, default=8)
    ap.add_argument('--colunas', type=int, default=12)
    a = ap.parse_args()

    lista = vinhos(ler_celulas(a.planilha))
    letras = [chr(ord('A') + i) for i in range(a.fileiras)]

    out = sys.stdout
    out.write(f'-- Importação gerada por tools/importar-planilha.py: {len(lista)} vinhos, '
              f'{sum(v["quantity"] for v in lista)} garrafas, adega {a.fileiras}x{a.colunas}\n')
    out.write('begin;\n\n')
    out.write('create temp table _dono on commit drop as\n'
              f'  select id from auth.users where email = {sql_str(a.email)};\n')
    out.write("do $$ begin\n  if (select count(*) from _dono) <> 1 then\n"
              f"    raise exception 'Usuário {a.email} não existe no Supabase. Crie a conta antes.';\n"
              "  end if;\n"
              "  if exists (select 1 from public.wines where owner_id = (select id from _dono)) then\n"
              "    raise exception 'Esse usuário já tem vinhos. Importação abortada para não duplicar.';\n"
              "  end if;\nend $$;\n\n")

    out.write('insert into public.wines (owner_id, name, year, type, country, grape, price, quantity, min_stock, source_note) values\n')
    valores = [
        f"  ((select id from _dono), {sql_str(v['name'])}, {sql_str(v['year'])}, 'Tinto', "
        f"{sql_str(v['country'])}, {sql_str(v['grape'])}, {v['price']}, {v['quantity']}, 0, {sql_str(v['source_note'])})"
        for v in lista
    ]
    out.write(',\n'.join(valores) + ';\n\n')

    if a.fileiras == 0:  # tamanho da adega ainda desconhecido: grade criada depois
        out.write('commit;\n')
        return
    out.write('insert into public.cellar_slots (owner_id, "row", "column")\n'
              f"select (select id from _dono), r, c\n"
              f"from unnest(array[{', '.join(sql_str(l) for l in letras)}]) r,\n"
              f"     generate_series(1, {a.colunas}) c\n"
              'on conflict do nothing;\n\ncommit;\n')


if __name__ == '__main__':
    main()
