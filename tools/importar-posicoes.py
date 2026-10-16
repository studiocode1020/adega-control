"""Gera o SQL que coloca na grade da adega as posições da coluna P da planilha.

Uso (depois de importar os vinhos com tools/importar-planilha.py):
  python3 -I tools/importar-posicoes.py PLANILHA.xlsx EMAIL_DO_CLIENTE > supabase/import/posicoes.sql

Leitura provisória dos códigos (a confirmar com o cliente):
  - número >= 3 + letra (13M) = uma garrafa na grade: fileira M, coluna 13
  - 1 ou 2 + letra (1H, 2K) e EX1..EX6 parecem prateleiras e expositores com várias
    garrafas: não cabem na grade (uma garrafa por lugar) e vão para wines.location,
    que aparece no detalhe do vinho como "Outros lugares"
  - lugar da grade repetido entre vinhos: fica com o primeiro, os outros vão para location

Cada vinho é achado pela linha da planilha gravada em source_note na importação.
A saída contém dados do cliente: NUNCA commitar (supabase/import/ está no .gitignore).
"""
import argparse
import importlib.util
import os
import re
import sys

_spec = importlib.util.spec_from_file_location(
    'importar_planilha', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'importar-planilha.py'))
imp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(imp)

FILEIRAS = 'ABCDEFGHIJKLMNOP'
TOKEN = re.compile(r'EX\s*(\d)|(\d{1,2})\s*([A-P])(?![A-Z])')


def codigos(texto):
    """'1K, 17B,170' -> ['1K', '17B', '17O'] (corrige 0 digitado no lugar de O)."""
    t = texto.upper().replace('.', ',').replace('[', ',').replace(']', ',')
    t = re.sub(r'\b(\d{1,2})\s*0\b(?!\s*[A-P])', lambda m: m.group(1) + 'O' if m.group(1) != '1' else m.group(0), t)
    achados = []
    for m in TOKEN.finditer(t):
        achados.append(f'EX{m.group(1)}' if m.group(1) else f'{int(m.group(2))}{m.group(3)}')
    sobra = re.sub(r'[\s,]+', ' ', TOKEN.sub(' ', t)).strip()
    return achados, sobra


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('planilha')
    ap.add_argument('email')
    a = ap.parse_args()

    ocupados = {}
    linhas_sql = []
    avisos = []
    colunas = 0
    for v in imp.vinhos(imp.ler_celulas(a.planilha)):
        chave = v['source_note'].split(';')[0]  # "linha N da planilha"
        grade, fora = [], []
        for trecho in re.findall(r'posições: ([^;|]*)', v['source_note']):
            achados, sobra = codigos(trecho)
            if sobra:
                fora.append(sobra)
                avisos.append(f'{v["name"]}: não entendi "{sobra}" em "{trecho.strip()}"')
            for c in achados:
                num = re.match(r'(\d+)([A-P])$', c)
                if num and int(num.group(1)) >= 3:
                    lugar = (num.group(2), int(num.group(1)))
                    if lugar in ocupados:
                        avisos.append(f'{v["name"]}: {c} já é de {ocupados[lugar]}')
                        fora.append(c)
                    else:
                        ocupados[lugar] = v['name']
                        grade.append(lugar)
                        colunas = max(colunas, lugar[1])
                else:
                    fora.append(c)
        if not grade and not fora:
            continue
        alvo = (f"(select id from public.wines where owner_id = (select id from _dono) "
                f"and source_note like {imp.sql_str(chave + '%')})")
        for fileira, coluna in grade:
            linhas_sql.append(f"update public.cellar_slots set wine_id = {alvo} "
                              f"where owner_id = (select id from _dono) and \"row\" = '{fileira}' and \"column\" = {coluna};")
        if fora:
            linhas_sql.append(f"update public.wines set location = {imp.sql_str(', '.join(fora))} "
                              f"where owner_id = (select id from _dono) and source_note like {imp.sql_str(chave + '%')};")

    out = sys.stdout
    out.write(f'-- Posições geradas por tools/importar-posicoes.py: {len(ocupados)} garrafas na grade '
              f'{len(FILEIRAS)}x{colunas}\n')
    for aviso in avisos:
        out.write(f'-- AVISO: {aviso}\n')
    out.write('begin;\n\n')
    out.write('create temp table _dono on commit drop as\n'
              f'  select id from auth.users where email = {imp.sql_str(a.email)};\n')
    out.write("do $$ begin\n  if (select count(*) from _dono) <> 1 then\n"
              f"    raise exception 'Usuário {a.email} não existe no Supabase.';\n"
              "  end if;\n"
              "  if exists (select 1 from public.cellar_slots where owner_id = (select id from _dono) and wine_id is not null) then\n"
              "    raise exception 'A grade já tem garrafas. Nada foi alterado.';\n"
              "  end if;\nend $$;\n\n")
    # Fileiras A..P e colunas 1..N: o mesmo formato que a tela Adega usa ao redimensionar
    out.write('insert into public.cellar_slots (owner_id, "row", "column")\n'
              'select (select id from _dono), r, c\n'
              f"from unnest(array[{', '.join(imp.sql_str(l) for l in FILEIRAS)}]) r,\n"
              f'     generate_series(1, {colunas}) c\n'
              'on conflict do nothing;\n\n')
    out.write('\n'.join(linhas_sql) + '\n\ncommit;\n')


if __name__ == '__main__':
    main()
