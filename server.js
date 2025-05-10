const fs = require("fs");
const https = require("https");
const argon2  = require("argon2");
const express = require("express");
const mariaDB = require("mysql2/promise");
const axios = require('axios');
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET;
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(cookieParser());

const cors = require("cors");
app.use(
    cors(
        {
            origin : 'http://localhost:5173',
            credentials : true
        }
    )
);

//https 인증서 위치
const options = {
    key : fs.readFileSync(process.env.HTTPS_KEY),
    cert : fs.readFileSync(process.env.HTTPS_CERT),
    ca : fs.readFileSync(process.env.HTTPS_CA),
};

const db = mariaDB.createPool({
    host : process.env.DB_HOST,
    port : process.env.DB_PORT,
    user : process.env.DB_USER,
    password : process.env.DB_PASSWORD,
    database : process.env.DB_SCHEMA
});

app.post("/SignUp", async (req, res) => {
    const { email, nickname, password } = req.body;
    try {
        const hashPassword = await argon2.hash(password, {
            type : argon2.argon2id,
            timeCost : process.env.TIME_COST,
            memoryCost : 1 << process.env.MEMORY_COST,
            parallelism : process.env.PARALLELISM
        });

        await db.query('INSERT INTO USERS(EMAIL, PASSWORD, NICKNAME) VALUES(?, ?, ?)', [email, hashPassword, nickname]);

        console.log(`${email}  회원가입 성공`);
        return res.status(200).json({message : "회원가입이 완료되었습니다."});
    } catch (error) {
        console.error(error)
        return res.status(500).json({error : "회원가입에 실패했습니다."})
    }
});

app.post("/Login", async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const [rows] = await db.query(
        'SELECT PASSWORD FROM USERS WHERE EMAIL = ?',
        [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "아이디 또는 패스워드가 올바르지않습니다." });
        }

        const fail = rows[0].FAIL_COUNT;

        if(fail >= 5){
            return res.status(401).json({ message: "패스워드 5회 이상 실패했습니다.\n비밀번호 변경 후 다시 시도해주세요." });
        }

        const hash = rows[0].PASSWORD;
        const valid = await argon2.verify(hash, password);

        if (!valid) {
            await db.query('UPDATE USERS SET FAIL_COUNT=? WHERE EMAIL=?', [fail + 1, email]);
            return res.status(404).json({ message: "아이디 또는 패스워드가 올바르지않습니다." });
        }

        await db.query('UPDATE USERS SET FAIL_COUNT=? WHERE EMAIL=?', [0, email]);

        const token = jwt.sign({email}, jwtSecret, {expiresIn : '30m'});

        await db.query('INSERT INTO TOKEN_USER(EMAIL, TOKEN) VALUES(?, ?) ON DUPLICATE KEY UPDATE TOKEN=?', [email, token. token]);

        res.cookie('token', token, {
            httpOnly : true,
            secure : process.env.NODE_ENV === 'production', // 정식일 땐 true로 교체
            sameSite : 'strict',
            maxAge : 30 * 60 * 1000
        });

        return res.status(200).json({ message: `${email}님 환영합니다.` });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "로그인 중 오류가 발생했습니다." });
    }
});

app.get('/checkToken', authenticateToken, (req, res) => {
    const payload = { email : req.user.email};

    const newToken = jwt.sign(payload, jwtSecret, {expiresIn : '30m'});

    res.cookie('token', newToken, {
        httpOnly : true,
        secure : process.env.NODE_ENV === 'production', // 정식일 땐 true로 교체
        sameSite : 'strict',
        maxAge : 30 * 60 * 1000
    });

    return res.status(200).json({
        authenticated : true,
        user : req.user
    });
});

app.post('/logout', authenticateToken, async (req, res) => {
    const email = req.user.email;

    await db.query("DELETE FROM TOKEN_USER WHERE EMAIL=?", [email]);

    res.clearCookie('token');
    
    return res.status(200).json({message : "로그아웃되었습니다."});
});

app.get("/test", async (req, res) => {
    try {
        const test = await axios.get(`http://api.nongsaro.go.kr/service/feedRawMaterial/upperList/apiKey=${process.env.ANIMAL_FOOD_API}`);

        console.log(test.data);
        return res.status(200).json({ test: test.data });
    } catch (error) {
        console.error(error);
        return res.status(404).json({
            message: error.message,
            ...(error.response && { details: error.response.data }),
          });
    }
})

https.createServer(options, app).listen(3333, () => console.log("서버가 연결되었습니다."));

function authenticateToken(req, res, next) {
    const token = req.cookies.token;

    if(!token) return res.status(404).json({ message : "토큰이 없습니다."});

    jwt.verify(token, jwtSecret, async (err, user) => {
        if(err) return res.status(401).json({ message : "유효하지 않은 토큰입니다."});

        const nowToken = await db.query("SELECT * FROM TOKEN_USER WHERE EMAIL=? AND TOKEN=?", [user, token]);

        if(nowToken === 0) {
            res.clearCookie('token');
            return res.status(401).json({message : "다른 곳에서 로그인을 시도했습니다.\n안전을 위해 로그아웃되었습니다."});
        }
        req.user = user;
        next();
    })
}