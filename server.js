const express = require("express");
const cors = require("cors");
const fs = require("fs");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const USERS_FILE = "users.json";

const readUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
};

const saveUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

app.post("/register", (req, res) => {
    const users = readUsers();
    const { name, age, email, password, childName = null, childAge = null } = req.body;

    if (users.find(u => u.email === email)) {
        return res.status(400).json({ message: "Usuário já existe" });
    }

    users.push({ name, age, email, password, childName, childAge });
    saveUsers(users);

    res.status(200).json({ user: true });
});

app.post("/login", (req, res) => {
    const users = readUsers();
    const { email, password } = req.body;

    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        return res.status(400).json({ message: "E-mail e/ou senha inválida" });
    }

    res.status(200).json({ user });
});

app.put("/update-child", (req, res) => {
    const users = readUsers();
    const { email, childName = null, childAge = null } = req.body;

    const userIndex = users.findIndex(u => u.email === email);
    if (userIndex === -1) {
        return res.status(404).json({ message: "Usuário não encontrado" });
    }

    users[userIndex].childName = childName;
    users[userIndex].childAge = childAge;

    saveUsers(users);

    res.status(200).json({ message: "Dados da criança atualizados com sucesso" });
});

app.put("/update-conditions", (req, res) => {
    const users = readUsers();
    const { email, conditions = [] } = req.body;

    const userIndex = users.findIndex(u => u.email === email);
    if (userIndex === -1) {
        return res.status(404).json({ message: "Usuário não encontrado" });
    }

    users[userIndex].conditions = conditions;
    saveUsers(users);

    res.status(200).json({ message: "Condições atualizadas com sucesso" });
});

const { exec } = require("child_process");

app.post('/analyze-local', upload.single('audio'), async (req, res) => {
    const expected = req.body.expected?.toLowerCase();
    const audioPath = req.file.path;

    const command = `whisper-env/bin/python3 whisper_runner.py ${audioPath}`;

    exec(command, { cwd: __dirname }, (err, stdout, stderr) => {
        fs.unlink(audioPath, () => {});

        if (err) {
            console.error(stderr);
            return res.status(500).json({ error: "Erro ao rodar Whisper localmente." });
        }
        
        const result = stdout.trim().toLowerCase();

        const isCorrect = result === expected;
        res.json({ expected, result, isCorrect });
    });  
});

app.listen(PORT, "0.0.0.0", () =>
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`)
);
