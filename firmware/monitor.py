#!/usr/bin/env python3
"""Monitor serial do firmware do ESP32.

Diferente do `tools/rfid/fm50x.mjs monitor`, que despeja hexadecimal porque
o protocolo do leitor e binario, este aqui mostra TEXTO e sabe resetar a
placa antes de escutar — sem isso voce perde o banner de boot e a varredura
de redes, que sao justamente as partes uteis.

    python3 firmware/monitor.py --port /dev/cu.usbmodemXXXX --reset

O firmware do marco 3 aceita comandos (i, z, 1, 0, >CMD). Num terminal de
verdade basta digitar; para roteiro automatico use --enviar, que espera o boot
terminar antes de mandar:

    python3 firmware/monitor.py --port ... --reset --enviar i --apos 15

Depende do pyserial, que ja vem junto com o esptool.
"""

import argparse
import glob
import select
import sys
import time

try:
    import serial
except ImportError:
    sys.exit("falta o pyserial:  python3 -m pip install --user pyserial")


def portas_candidatas():
    return [
        p
        for p in sorted(glob.glob("/dev/cu.*"))
        if "Bluetooth" not in p and "debug-console" not in p
    ]


def resetar(ser):
    """Sequencia de auto-reset das placas ESP32.

    EN vem do RTS e GPIO0 vem do DTR, atraves de dois transistores. Manter
    DTR em falso garante que a placa cai em modo de EXECUCAO, e nao no
    bootloader de gravacao.
    """
    ser.dtr = False
    ser.rts = True   # segura o EN em reset
    time.sleep(0.15)
    ser.rts = False  # solta: a placa parte do zero
    time.sleep(0.05)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--seconds", type=float, default=25)
    ap.add_argument("--reset", action="store_true",
                    help="reseta a placa antes de escutar (pega o boot)")
    ap.add_argument("--enviar", action="append", default=[], metavar="CMD",
                    help="manda um comando ao firmware (pode repetir)")
    ap.add_argument("--apos", type=float, default=15,
                    help="segundos de espera antes de --enviar; o boot com "
                         "varredura de WiFi leva uns 12 s")
    args = ap.parse_args()

    porta = args.port
    if not porta:
        candidatas = portas_candidatas()
        if len(candidatas) != 1:
            sys.exit(
                "achei %d portas; escolha com --port:\n  %s"
                % (len(candidatas), "\n  ".join(candidatas) or "(nenhuma)")
            )
        porta = candidatas[0]

    print(f"  escutando {porta} @ {args.baud} por {args.seconds:.0f}s")
    print("  " + "-" * 60)

    with serial.Serial(porta, args.baud, timeout=0.1) as ser:
        if args.reset:
            resetar(ser)
            ser.reset_input_buffer()

        fim = time.time() + args.seconds
        envio_em = time.time() + args.apos if args.enviar else None
        # Digitar so faz sentido com terminal de verdade; em pipe o stdin
        # fecha na hora e ficaria em laco lendo vazio.
        interativo = sys.stdin.isatty()
        buffer = b""
        while time.time() < fim:
            if envio_em is not None and time.time() >= envio_em:
                for cmd in args.enviar:
                    print(f"  > {cmd}")
                    sys.stdout.flush()
                    ser.write(cmd.encode() + b"\r\n")
                    time.sleep(0.4)
                envio_em = None

            if interativo and select.select([sys.stdin], [], [], 0)[0]:
                digitado = sys.stdin.readline().strip()
                if digitado:
                    ser.write(digitado.encode() + b"\r\n")

            dados = ser.read(4096)
            if not dados:
                continue
            buffer += dados
            # imprime por linha completa; o resto fica para a proxima volta
            *linhas, buffer = buffer.split(b"\n")
            for linha in linhas:
                print("  " + linha.decode("utf-8", errors="replace").rstrip())
                sys.stdout.flush()

        if buffer.strip():
            print("  " + buffer.decode("utf-8", errors="replace").rstrip())

    print("  " + "-" * 60)


if __name__ == "__main__":
    main()
