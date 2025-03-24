import json
import os
import subprocess
import html
import math
import shutil
import zipfile
import requests
import sys
from PIL import Image, ImageTk
from ttkbootstrap import Style
import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from tkinter import messagebox, Canvas

# ========== AUTO ATUALIZADOR VIA GITHUB ==========
GITHUB_REPO = "Jeipidev/RespondeAI"  
LOCAL_SHA_FILE = "version.txt"
ZIP_URL = f"https://github.com/{GITHUB_REPO}/archive/refs/heads/main.zip"
COMMIT_URL = f"https://api.github.com/repos/{GITHUB_REPO}/commits/main"


def get_latest_sha():
    try:
        r = requests.get(COMMIT_URL, timeout=5)
        return r.json().get("sha", None)
    except:
        return None


def read_local_sha():
    return open(LOCAL_SHA_FILE).read().strip() if os.path.exists(LOCAL_SHA_FILE) else ""


def write_local_sha(sha):
    with open(LOCAL_SHA_FILE, 'w') as f:
        f.write(sha)


def download_and_extract_zip():
    print("🔄 Baixando nova versão do GitHub...")
    r = requests.get(ZIP_URL, stream=True)
    zip_path = "update.zip"

    with open(zip_path, 'wb') as f:
        shutil.copyfileobj(r.raw, f)

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall("update_temp")

    os.remove(zip_path)

    # Copia arquivos extraídos por cima do atual
    src_folder = os.path.join("update_temp", os.listdir("update_temp")[0])
    for root, dirs, files in os.walk(src_folder):
        rel_path = os.path.relpath(root, src_folder)
        dest_path = os.path.join(".", rel_path)

        os.makedirs(dest_path, exist_ok=True)
        for file in files:
            shutil.copy2(os.path.join(root, file), os.path.join(dest_path, file))

    shutil.rmtree("update_temp")
    print("✅ Atualização aplicada!")


def check_and_update():
    latest_sha = get_latest_sha()
    local_sha = read_local_sha()

    if latest_sha and latest_sha != local_sha:
        print("🧠 Nova versão detectada!")
        download_and_extract_zip()
        write_local_sha(latest_sha)
        print("🚀 Reiniciando app...")
        subprocess.Popen([sys.executable] + sys.argv)
        sys.exit()
    else:
        print("✅ Já está na versão mais recente")


# CHAMA ATUALIZADOR ANTES DE INICIAR GUI
check_and_update()

# ========== CAMINHOS ==========
CONFIG_PATH = os.path.join("config", "commands.json")
NODE_ENTRY = os.path.join("src", "index.js")
COMMANDS_DIR = os.path.join("src", "commands")
GLOW_PATH = os.path.join("assets", "glow.png")

# ========== CLASSE PRINCIPAL ==========
class CommandConfigApp:
    def __init__(self, root):
        self.root = root
        self.root.iconbitmap("assets/icon.ico")
        self.root.title("🤖 RespondeAI — Painel de Controle")
        self.root.geometry("900x600")
        self.root.configure(bg="#1e1e1e")

        self.commands = {}
        self.window_size = (900, 600)

        style = Style("darkly")
        self.style = style

        self.canvas = Canvas(root, bg="#1e1e1e", highlightthickness=0)
        self.canvas.place(relwidth=1, relheight=1)

        self.glow_base = Image.open(GLOW_PATH).convert("RGBA")
        self.glow_img = None
        self.glow1 = self.canvas.create_image(0, 0, image=None)
        self.glow2 = self.canvas.create_image(0, 0, image=None)
        self.canvas.lower("all")

        self.frame = ttk.Frame(root, padding=30, bootstyle="light")
        self.frame.place(relx=0.5, rely=0.5, anchor="center")
        self.frame.configure(style="Custom.TFrame")
        style.configure("Custom.TFrame", background="#2a2a2a", borderwidth=2, relief="ridge")

        self.logo = ttk.Label(self.frame, text="🧠 RespondeAI Dashboard", font=("Segoe UI Black", 24), bootstyle="success")
        self.logo.pack(pady=(0, 20))

        self.title = ttk.Label(self.frame, text="Gerencie seus comandos personalizados", font=("Segoe UI", 14), bootstyle="success")
        self.title.pack(pady=5)

        self.tree = ttk.Treeview(self.frame, columns=("name", "status"), show='headings', bootstyle="dark")
        self.tree.heading("name", text="Comando")
        self.tree.heading("status", text="Ativo")
        self.tree.column("name", width=200, anchor="center")
        self.tree.column("status", width=100, anchor="center")
        self.tree.pack(fill=BOTH, expand=True, pady=10)

        self.tree.bind('<Double-1>', self.toggle_command)

        btn_frame = ttk.Frame(self.frame)
        btn_frame.pack(pady=15)

        self.add_btn = ttk.Button(btn_frame, text="➕ Criar Comando", command=self.add_command, bootstyle="success-outline")
        self.add_btn.grid(row=0, column=0, padx=10)

        self.del_btn = ttk.Button(btn_frame, text="🗑️ Deletar", command=self.delete_command, bootstyle="danger-outline")
        self.del_btn.grid(row=0, column=1, padx=10)

        self.start_btn = ttk.Button(btn_frame, text="🚀 Iniciar Bot", command=self.start_bot, bootstyle="info-outline")
        self.start_btn.grid(row=0, column=2, padx=10)

        self.animation_time = 0
        self.reload()
        self.animate()

        self.root.bind("<Configure>", self.on_resize)

    def on_resize(self, event):
        self.window_size = (event.width, event.height)

    def animate(self):
        self.animation_time += 0.05
        w, h = self.window_size
        scale = 0.6 + 0.05 * math.sin(self.animation_time)
        size = int(min(w, h) * scale)

        self.glow_img = ImageTk.PhotoImage(self.glow_base.resize((size, size)))
        self.canvas.itemconfig(self.glow1, image=self.glow_img)
        self.canvas.itemconfig(self.glow2, image=self.glow_img)
        self.canvas.coords(self.glow1, 0, 0)
        self.canvas.coords(self.glow2, w, h)
        self.root.after(50, self.animate)

    def reload(self):
        if not os.path.exists(CONFIG_PATH):
            os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
            with open(CONFIG_PATH, 'w') as f:
                json.dump({}, f, indent=2)

        with open(CONFIG_PATH, 'r') as f:
            self.commands = json.load(f)

        for i in self.tree.get_children():
            self.tree.delete(i)

        for name, cfg in self.commands.items():
            self.tree.insert("", "end", iid=name, values=(name, "✅" if cfg.get("enabled", False) else "❌"))

    def toggle_command(self, event):
        item = self.tree.selection()[0]
        self.commands[item]['enabled'] = not self.commands[item].get('enabled', False)
        self.save_config()
        self.reload()

    def delete_command(self):
        item = self.tree.selection()
        if not item:
            messagebox.showwarning("Seleção obrigatória", "Selecione um comando para deletar")
            return

        cmd = item[0]
        if messagebox.askyesno("Confirmar", f"Deseja realmente deletar o comando '{cmd}'?"):
            js_path = os.path.join(COMMANDS_DIR, f"{cmd}.js")
            if os.path.exists(js_path):
                os.remove(js_path)
            self.commands.pop(cmd, None)
            self.save_config()
            self.reload()

    def add_command(self):
        def create():
            key = entry_name.get().strip()
            msg = entry_msg.get().strip()
            if not key or not msg:
                messagebox.showwarning("Erro", "Nome e mensagem são obrigatórios")
                return

            js_path = os.path.join(COMMANDS_DIR, f"{key}.js")
            if os.path.exists(js_path):
                messagebox.showerror("Erro", "Comando já existe!")
                return

            escaped_msg = msg.replace("`", "\\`").replace("\\", "\\\\")
            code = f"""
module.exports = {{
  command: "/{key}",
  response: `{escaped_msg}`,
  enabled: true
}};
"""
            with open(js_path, 'w', encoding="utf-8") as f:
                f.write(code.strip())

            self.commands[key] = {"enabled": True}
            self.save_config()
            win.destroy()
            self.reload()

        win = ttk.Toplevel(self.root)
        win.title("✨ Novo Comando - RespondeAI")
        win.geometry("400x220")

        ttk.Label(win, text="🔑 Nome do Comando (ex: oi)").pack(pady=5)
        entry_name = ttk.Entry(win)
        entry_name.pack(fill="x", padx=20)

        ttk.Label(win, text="💬 Mensagem a Enviar").pack(pady=5)
        entry_msg = ttk.Entry(win)
        entry_msg.pack(fill="x", padx=20)

        ttk.Button(win, text="✅ Criar Comando", command=create, bootstyle="success-outline").pack(pady=15)

    def save_config(self):
        with open(CONFIG_PATH, 'w') as f:
            json.dump(self.commands, f, indent=2)

    def start_bot(self):
        try:
            startupinfo = None
            if os.name == 'nt':
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            subprocess.Popen(["node", NODE_ENTRY], startupinfo=startupinfo)
        except Exception as e:
            messagebox.showerror("Erro ao iniciar", str(e))

# ========== MAIN ==========
if __name__ == '__main__':
    if sys.platform == "win32":
        import ctypes
        whnd = ctypes.windll.kernel32.GetConsoleWindow()
        if whnd != 0:
            ctypes.windll.user32.ShowWindow(whnd, 0)

    app = CommandConfigApp(ttk.Window(themename="darkly"))

    try:
        app.root.iconbitmap("assets/icon.ico")
    except Exception:
        icon = ImageTk.PhotoImage(file="assets/icon.png")
        app.root.iconphoto(True, icon)

    app.root.mainloop()