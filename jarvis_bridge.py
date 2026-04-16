import os
import shutil
import time

def organize_files(directory):
    """
    Simula o protocolo de organização do JARVIS.
    Move arquivos para pastas baseadas em suas extensões.
    """
    print(f"[JARVIS] Iniciando Protocolo de Organização em: {directory}")
    
    extensions = {
        'Documentos': ['.pdf', '.docx', '.txt', '.xlsx'],
        'Imagens': ['.jpg', '.png', '.gif', '.svg'],
        'Videos': ['.mp4', '.mkv', '.mov'],
        'Audios': ['.mp3', '.wav'],
        'Instaladores': ['.exe', '.msi', '.deb'],
        'Codigo': ['.py', '.js', '.ts', '.html', '.css', '.json']
    }

    if not os.path.exists(directory):
        print(f"[JARVIS] Erro: Diretório {directory} não encontrado.")
        return

    for filename in os.listdir(directory):
        filepath = os.path.join(directory, filename)
        if os.path.isfile(filepath):
            moved = False
            for folder, exts in extensions.items():
                if any(filename.lower().endswith(e) for e in exts):
                    dest_path = os.path.join(directory, folder)
                    if not os.path.exists(dest_path):
                        os.makedirs(dest_path)
                    shutil.move(filepath, os.path.join(dest_path, filename))
                    print(f"[JARVIS] {filename} -> {folder}/")
                    moved = True
                    break
            if not moved:
                dest_path = os.path.join(directory, 'Outros')
                if not os.path.exists(dest_path):
                    os.makedirs(dest_path)
                shutil.move(filepath, os.path.join(dest_path, filename))
                print(f"[JARVIS] {filename} -> Outros/")

    print("[JARVIS] Protocolo de Organização Concluído com Sucesso.")

if __name__ == "__main__":
    print("--- JARVIS BRIDGE PROTOCOL V1.0 ---")
    print("Aguardando comandos do núcleo central...")
    # Exemplo de uso: organize_files(os.path.expanduser("~/Downloads"))
    organize_files("./") # Organiza a pasta local por padrão no teste
