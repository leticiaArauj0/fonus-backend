const express = require("express");
const cors = require("cors");
const axios = require('axios');
const fs = require("fs");
const multer = require("multer");

const upload = multer({ dest: "uploads/" });
const DEEPGRAM_API_KEY = 'b0cd8fb91ee60ecd9ba05a2b5eeeaf276795079f';

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

app.put("/update-agegroup", (req, res) => {
    const users = readUsers();
    const { email, ageGroup } = req.body;

    if (!email || !ageGroup) {
        return res.status(400).json({ message: "Email e ageGroup são obrigatórios" });
    }

    const validAgeGroups = ['2-3', '4-5', '6-7'];
    if (!validAgeGroups.includes(ageGroup)) {
        return res.status(400).json({ message: "Faixa etária inválida" });
    }

    const userIndex = users.findIndex(u => u.email === email);
    if (userIndex === -1) {
        return res.status(404).json({ message: "Usuário não encontrado" });
    }

    users[userIndex].ageGroup = ageGroup;
    saveUsers(users);

    res.status(200).json({ 
        message: "Faixa etária atualizada com sucesso",
        user: users[userIndex]
    });
});

app.post('/analyze-deepgram', upload.single('audio'), async (req, res) => {
    const expected = req.body.expected?.toLowerCase();
    const audioPath = req.file.path;

    try {
        const audioFile = fs.readFileSync(audioPath);
        
        const response = await axios.post(
            'https://api.deepgram.com/v1/listen',
            audioFile,
            {
                headers: {
                    'Authorization': `Token ${DEEPGRAM_API_KEY}`,
                    'Content-Type': 'audio/mpeg',
                },
                params: {
                    language: 'pt-BR',
                    model: 'nova-2',
                    punctuate: false,
                },
            }
        );

        const transcript = response.data.results.channels[0].alternatives[0].transcript.toLowerCase().trim();
        const isCorrect = transcript === expected;

        res.json({
            expected,
            result: transcript,
            isCorrect,
        });

    } catch (error) {
        console.error('Erro no Deepgram:', error.response?.data || error.message);
        res.status(500).json({ error: 'Falha na transcrição' });
    } finally {
        fs.unlink(audioPath, () => {});
    }
});


app.listen(PORT, "0.0.0.0", () =>
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`)
);
