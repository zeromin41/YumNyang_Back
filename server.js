require('dotenv').config();
const fs = require("fs");
const https = require("https");
const argon2  = require("@node-rs/argon2");
const express = require("express");
const mariaDB = require("mysql2/promise");
const axios = require('axios');
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET;
const cookieParser = require('cookie-parser');
const { XMLParser } = require('fast-xml-parser');
const path = require('path');
const multer = require('multer');
const winston = require('winston')
require('winston-daily-rotate-file')

const app = express();
app.use(express.json());
app.use(cookieParser());

const UPLOAD_PATH = process.env.UPLOAD_PATH || path.join(__dirname, 'uploads');

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

if(!fs.existsSync(path.join(UPLOAD_PATH, 'uploads'))){
    fs.mkdirSync(path.join(UPLOAD_PATH, 'uploads'), { recursive : true })
}

const storage = multer.diskStorage({
    destination : (req, file, cb) => {
        cb(null, path.join(UPLOAD_PATH, 'uploads'));
    },
    filename : (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const transport = new winston.transports.DailyRotateFile({
    dirname : logDir,
    filename : '%DATE%.log',
    datePattern : 'YYYY-MM-DD',
    zippedArchive : false,
    maxSize : '20m',
    maxFiles : '14d'
});

const logger = winston.createLogger({
    level : 'info',
    format : winston.format.combine(
        winston.format.timestamp({ format : 'YYYY-MM-DD HH:mm:ss'}),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level} : ${message}`)
    ),

    transports : [
        transport,
        new winston.transports.Console()
    ]
});



/**
 * 회원 관리
 */

 // 회원가입
app.post("/signUp", async (req, res) => {
    const { email, nickname, password, name, type, age } = req.body;
    try {

        if(effectiveness(email, nickname, password)) return res.status(404).json({message : "올바르지못한 형식입니다."});

        const hashPassword = await argon2.hash(password, {
            type : argon2.Algorithm.Argon2id,
            timeCost : Number(process.env.TIME_COST),
            memoryCost : 1 << Number(process.env.MEMORY_COST),
            parallelism : Number(process.env.PARALLELISM)
        });

        await db.query('INSERT INTO USERS(EMAIL, PASSWORD, NICKNAME) VALUES(?, ?, ?)', [email, hashPassword, nickname]);

        const [result] = await db.query('SELECT ID FROM USERS WHERE EMAIL=?', [email]);

        if(name && type){
            await db.query("INSERT INTO PETS(USER_ID, NAME, TYPE, AGE) VALUES(?, ?, ?, ?)", [result[0].ID, name, type, age ? age : null]);
        }

        logger.info(`${email}  회원가입 성공`);
        return res.status(200).json({message : "회원가입이 완료되었습니다."});
    } catch (error) {
        logger.error(error)
        return res.status(500).json({error : "회원가입에 실패했습니다."})
    }
});

// 아이디 확인
app.post("/checkId", async (req, res) => {
    try {
        const { email } = req.body;

        if(effectiveness(email, undefined, undefined)) return res.status(404).json({message : "올바르지못한 형식입니다."});

        const [rows] = await db.query("SELECT * FROM USERS WHERE EMAIL=?", [email]);

        if(rows.length > 0) return res.status(404).json({message : "존재하는 아이디입니다."});
        
        return res.status(200).json({message : "사용가능한 아이디입니다."});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "서버에 문제가 발생했습니다."});
    }
});

// 닉네임 확인
app.post("/checkNickname", async (req, res) => {
    try {
        const { nickname } = req.body;

        if(effectiveness(undefined, nickname, undefined)) return res.status(404).json({message : "올바르지못한 형식입니다."});

        const [rows] = await db.query("SELECT * FROM USERS WHERE NICKNAME=?", [nickname]);

        if(rows.length > 0) return res.status(404).json({message : "존재하는 닉네임입니다."});
        
        return res.status(200).json({message : "사용가능한 닉네임입니다."});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "서버에 문제가 발생했습니다."});
    }
});

// 회원 탈퇴
app.post("/withdraw", async (req, res) => {
    const {id, email, password} = req.body;

    try {
        if(effectiveness(email, undefined, password)) return res.status(404).json({message : "올바르지못한 형식입니다."});

        const [rows] = await db.query(
            'SELECT PASSWORD FROM USERS WHERE ID=? AND EMAIL=?',
            [id,email]
        );

        if (rows.length === 0) {
            return res.status(500).json({ message: "정상적인 접근이 아닙니다." });
        }

        const hash = rows[0].PASSWORD;

        const valid = await argon2.verify(hash, password);

        if(!valid) return res.status(404).json({ message: "패스워드가 올바르지않습니다." });

        await db.query("DELETE FROM USERS WHERE EMAIL=?", [email]);
        await db.query("DELETE FROM TOKEN_USER WHERE EMAIL=?", [email]);
        res.clearCookie('token', {
            httpOnly : true,
            secure : true, // 정식일 땐 true로 교체
            sameSite : 'none',
            path : "/",
            maxAge : 0
        });
        
        logger.info(`${email}님이 회원을 탈퇴했습니다.`);
        return res.status(200).json({message : "회원탈퇴되었습니다."});

    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "회원탈퇴에 실패했습니다."});
    }
});

// 로그인
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    
    try {
        if(effectiveness(email, undefined, password)) return res.status(404).json({message : "올바르지못한 형식입니다."});

        const [rows] = await db.query(
        'SELECT * FROM USERS WHERE EMAIL = ?',
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
            logger.info("로그인 실패");
            return res.status(404).json({ message: "아이디 또는 패스워드가 올바르지않습니다." });
        }

        await db.query('UPDATE USERS SET FAIL_COUNT=? WHERE EMAIL=?', [0, email]);

        const token = jwt.sign({email}, jwtSecret, {expiresIn : '30m'});

        await db.query('INSERT INTO TOKEN_USER(EMAIL, TOKEN) VALUES(?, ?) ON DUPLICATE KEY UPDATE TOKEN=?', [email, token, token]);

        res.cookie('token', token, {
            httpOnly : true,
            secure : true, // 정식일 땐 true로 교체
            sameSite : 'none',
            path : "/",
            maxAge : 30 * 60 * 1000
        });

        const id = rows[0].ID;
        const nickname = rows[0].NICKNAME;

        logger.info(`${nickname}님이 로그인했습니다.`);
        return res.status(200).json({ message: `${nickname}님 환영합니다.`, number : id });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({ error: "로그인 중 오류가 발생했습니다." });
    }
});

// 회원 토큰 관리
app.get('/checkToken', authenticateToken, (req, res) => {
    try {
        const payload = { email : req.user.email};

        if(effectiveness(payload.email, undefined, undefined)) return res.status(404).json({message : "올바르지못한 형식입니다."});

        const newToken = jwt.sign(payload, jwtSecret, {expiresIn : '30m'});

        res.cookie('token', newToken, {
            httpOnly : true,
            secure : true, // 정식일 땐 true로 교체
            sameSite : 'none',
            path : "/",
            maxAge : 30 * 60 * 1000
        });

        logger.info(`${payload.email}님의 token이 업데이트 되었습니다.`);

        return res.status(200).json({
            authenticated : true,
            user : req.user
        });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "비정상적 접근입니다."});
    }
});

// 로그아웃
app.post('/logout', authenticateToken, async (req, res) => {
    try {
        const email = req.user.email;

        if(effectiveness(email, undefined, undefined)) return res.status(404).json({message : "올바르지못한 형식입니다."});

        await db.query("DELETE FROM TOKEN_USER WHERE EMAIL=?", [email]);

        res.clearCookie('token', {
            httpOnly : true,
            secure : true, // 정식일 땐 true로 교체
            sameSite : 'none',
            path : "/",
            maxAge : 0
        });
        
        logger.info(`${email}님이 로그아웃했습니다.`);
        return res.status(200).json({message : "로그아웃되었습니다."});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "로그아웃에 실패했습니다."})
    }
});

//비밀번호 확인
app.post('/passwordCheck', async (req, res) => {
    try {
        const {id, email, password} = req.body;
        
        if(effectiveness(email, undefined, password)) return res.status(404).json({message : "올바르지못한 형식입니다."});

        const [rows] = await db.query(
            'SELECT PASSWORD FROM USERS WHERE ID=? AND EMAIL=?',
            [id,email]
        );

        if (rows.length === 0) {
            return res.status(500).json({ message: "정상적인 접근이 아닙니다." });
        }

        const hash = rows[0].PASSWORD;

        const valid = await argon2.verify(hash, password);

        if(!valid) return res.status(404).json({ message: "패스워드가 올바르지않습니다." });

        return res.status(200).json({message : "비밀번호가 확인되었습니다."});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "서버에 오류가 발생했습니다."});
    }
});

// 내용 변경
app.post('/changeUserInfo', async (req, res) => {
    const { id, nickname, password } = req.body;
    try {

        const assignments = [];
        const query = [];
        if(nickname) {
            assignments.push('NICKNAME=?')
            query.push(nickname)
        }
        if(password){
            const hashPassword = await argon2.hash(password, {
                type : argon2.Algorithm.Argon2id,
                timeCost : Number(process.env.TIME_COST),
                memoryCost : 1 << Number(process.env.MEMORY_COST),
                parallelism : Number(process.env.PARALLELISM)
            });

            assignments.push('PASSWORD=?')
            query.push(hashPassword);
        }
        query.push(id);

        await db.query(`UPDATE USERS SET ${assignments.join(', ')} WHERE ID=?`, query);

        logger.info(`${id} 회원정보 변경 성공`);
        return res.status(200).json({message : "회원정보 변경이 완료되었습니다."});
    } catch (error) {
        logger.error(error)
        return res.status(500).json({error : "회원 정보 변경에 실패했습니다."});
    }
});

// 유저 닉네임 찾기
app.get("/getUserNickname/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query("SELECT NICKNAME FROM USERS WHERE ID=?", [id]);

        if(rows.length === 0) return res.status(404).json({message : "유저가 존재하지않습니다."});

        return res.status(200).json({nickname : rows[0]});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "유저 정보를 가져오는데 실패했습니다."});
    }
});

/**
 * 반려동물 정보
 */

//반려동물 정보 추가
app.post("/addPetInfo", async (req, res) => {
    try {
        const { userId, name, type, age } = req.body;

        await db.query("INSERT INTO PETS(USER_ID, NAME, TYPE, AGE) VALUES(?, ?, ?, ?)", [userId, name, type, age ? age : null]);

        logger.info(`아이디 ${userId}님의 펫 정보를 입력하였습니다.`);
        return res.status(200).json({message : "펫 정보가 입력되었습니다."});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "반려동물 정보를 입력하는데 실패했습니다."});
    }
});

//반려동물 정보 업데이트
app.post("/UpdatePetInfo", async (req, res) => {
    try {
        const { id, userId, name, type, age } = req.body;

        await db.query("UPDATE PETS SET NAME=?, TYPE=?, AGE=? WHERE ID=?", [name, type, age, id]);

        logger.info(`아이디 ${userId}님의 펫 정보를 변경하였습니다.`);
        return res.status(200).json({message : "펫 정보가 변경되었습니다."});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "반려동물 정보를 변경하는데 실패했습니다."});
    }
});

// 반려동물 정보 가져오기
app.get("/getPetInfo/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const [rows] = await db.query("SELECT * FROM PETS WHERE USER_ID=?", [userId]);

        if(rows.length === 0) return res.status(404).json({message : "등록된 펫이 없습니다."});
        logger.info(`${userId}님의 등록된 펫을 가져옵니다.`);
        return res.status(200).json({pets : rows});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "반려동물 정보를 가져오는데 실패했습니다."});
    }
});

// 반려동물 정보 삭제하기
app.post("/removePetInfo/:id", async (req, res) => {
    try {
        const { id } = req.params;

        await db.query("DELETE FROM PETS WHERE ID=?", [id]);

        logger.info(`${id}를 삭제했습니다.`);
        return res.status(200).json({message : "반려동물 정보를 삭제했습니다."});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "반려동물 정보를 삭제하는데 실패했습니다."});
    }
})

/**
 * 레시피
 */

// 카테고리 불러오기
/**
 * code : codeNm
 * 402001 : 농산물
 * 402002 : 축산물
 * 402003 : 수산물
 * 402004 : 부산물
 * 402005 : 기타
 */
app.get("/getCategory", async (req, res) => {
    try {
        const options = {
            ignoreAttributes : false,
            cdataPropName : "value"
        };

        const parser = new XMLParser(options);

        const category = await axios.get(`http://api.nongsaro.go.kr/service/feedRawMaterial/upperList?apiKey=${process.env.ANIMAL_FOOD_API}`);

        const jsonObj = parser.parse(category.data);

        const items = jsonObj.response.body.items.item;
        const cleanItems = items.map(i => ({
            code : i.code.value,
            codeNm : i.codeNm.value
        }));

        logger.info("분류 코드 가져오기");
        return res.status(200).json({ category: cleanItems });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            message: error.message,
            ...(error.response && { details: error.response.data }),
          });
    }
});

// 반려동물 집밥 원료 불러오기
app.post("/getIngredient", async (req, res) => {
    try {
        const options = {
            ignoreAttributes : true,
            cdataPropName : "value",
            parseTagValue : false
        };

        const { upperListSel } = req.body;

        const parser = new XMLParser(options);

        const test = await axios.get(`http://api.nongsaro.go.kr/service/feedRawMaterial/feedRawMaterialAllList?apiKey=${process.env.ANIMAL_FOOD_API}${upperListSel ? `&upperFeedClCode=${upperListSel}` : ""}`);

        const jsonObj = parser.parse(test.data);

        const items = jsonObj.response.body.items.item;
        const cleanItems = items.map(i => {
            const obj = {};
            for(const [key, node] of Object.entries(i)){
                if(['feedNm', 'mitrQy', 'protQy', 'clciQy', 'phphQy', 'fatQy', 'crbQy', 'totEdblfibrQy', 'naQy', 'ptssQy'].includes(key))
                    obj[key] = (node && typeof node === 'object' && 'value' in node) ? node.value : node;
            }

            return obj;
        });

        logger.info("집밥원료 가져오기");
        return res.status(200).json({ ingredient: cleanItems });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            message: error.message,
            ...(error.response && { details: error.response.data }),
          });
    }
});

// 레시피 추가
app.post("/AddRecipe", upload.array('images', 10), async (req, res) => {
    try {
        const files = req.files;

        console.log(files)

        const urls = files.length > 0 ? files.map(f =>
            `${req.protocol}://${req.hostname}/uploads/${f.filename}`
        ) : null;

        const mainImage = urls ? urls[0] : null;
        const descriptionImage = urls ? urls.slice(1) : null;
        
        const {userId, title, description, targetPetType, foodCategory, cookingTimeLimit, level, caloriesPerServing, favoritesCount, carbs, protein, fat, calcium, phosphorus, moisture, fiber, ingredientsName, ingredientsAmount, ingredientsUnit} = req.body;
        await db.query(
            "INSERT INTO RECIPES(USER_ID, TITLE, MAIN_IMAGE_URL, TARGET_PET_TYPE, FOOD_CATEGORY, COOKING_TIME_LIMIT, LEVEL, CALORIES_PER_SERVING, FAVORITES_COUNT, NUTRITIONAL_INFO_CARBS_G, NUTRITIONAL_INFO_PROTEIN_G, NUTRITIONAL_INFO_FAT_G, NUTRITIONAL_INFO_CALCIUM_G, NUTRITIONAL_INFO_PHOSPHORUS_G, NUTRITIONAL_INFO_MOISTURE_PERCENT, NUTRITIONAL_INFO_FIBER_G) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            , [userId, title, mainImage, targetPetType, foodCategory, cookingTimeLimit, level, caloriesPerServing, favoritesCount, carbs, protein, fat, calcium, phosphorus, moisture, fiber]
        );

        const [result] = await db.query('SELECT ID FROM RECIPES WHERE USER_ID =? AND TITLE = ?', [userId, title]);

        for(const index in description){
            await db.query('INSERT INTO DESCRIPTION(RECIPE_ID, FLOW, DESCRIPTION, IMAGE_URL) VALUES (?, ?, ?, ?)', [result[0].ID, index, description[index], descriptionImage === null ? null : descriptionImage[index]]);
        }

        if(ingredientsName && ingredientsAmount && ingredientsUnit && ingredientsName.length === ingredientsAmount.length && ingredientsUnit.length === ingredientsAmount.length){
            for(const index in ingredientsName){
                await db.query('INSERT INTO RECIPE_INGREDIENTS(RECIPE_ID, INGREDIENT_NAME, QUANTITY_AMOUNT, QUANTITY_UNIT) VALUES(?, ?, ?, ?)', [result[0].ID, ingredientsName[index], ingredientsAmount[index], ingredientsUnit[index]]);
            }
        }

        logger.info("레시피 추가 완료");
        return res.status(200).json({message : "레시피 추가가 완료되었습니다."});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "레시피 추가에 실패했습니다."});
    }
});

// 레시피 수정
app.post("/updateRecipe", upload.array("newImages", 10), async (req, res) => {
    try {
        const recipeId = req.body.recipeId;
        const keepUrls = JSON.parse(req.body.keepUrls || '[]');
        const {userId, title, description, targetPetType, foodCategory, cookingTimeLimit, level, caloriesPerServing, favoritesCount, carbs, protein, fat, calcium, phosphorus, moisture, fiber, mainChange, descriptionChange, ingredientsName, ingredientsAmount, ingredientsUnit} = req.body;

        const [existing] = await db.query("SELECT ID, FLOW, IMAGE_URL FROM DESCRIPTION WHERE RECIPE_ID=?", [recipeId]);

        const toDelete = existing.filter(img => img.IMAGE_URL === null ? false : !keepUrls.includes(img.IMAGE_URL));

        for(let img of toDelete){
            if(img.IMAGE_URL === null) continue;
            const relativePath = img.IMAGE_URL.split("/uploads/")[1];
            const filePath = path.join(UPLOAD_PATH, 'uploads', relativePath);

            fs.unlink(filePath, err => {
                if(err) logger.error("delete file error", err);
            });
        }

        if(toDelete.length > 0){
            const ids = toDelete.map(i => i.ID);

            await db.query("DELETE FROM DESCRIPTION WHERE ID IN (?)", [ids]);
        }

        const newFiles = req.files;
        const newUrls = newFiles.length > 0 ? newFiles.map(f => `${req.protocol}://${req.hostname}/uploads/${f.filename}`) : null;

        const mainImage = mainChange && newUrls ? newUrls[0] : null;
        const descriptionImage = newUrls ? newUrls.slice( mainChange ? 1 : 0) : null;

        if(descriptionImage && descriptionImage.length > 0){
            for(const index in descriptionImage){
                await db.query('INSERT INTO DESCRIPTION(RECIPE_ID, FLOW, DESCRIPTION, IMAGE_URL) VALUES (?, ?, ?, ?)', [recipeId, descriptionChange[index], description[descriptionChange[index]], descriptionImage[index]]);
            }
        }

        for(const index in description){
            if(descriptionChange && descriptionChange.indexOf(index) !== -1){
                await db.query('UPDATE DESCRIPTION SET DESCRIPTION=? WHERE RECIPE_ID=? AND FLOW=?', [description[index], recipeId, index]);
            }
        }

        const update = mainChange ? [userId, title, mainImage, targetPetType, foodCategory, cookingTimeLimit, level, caloriesPerServing, favoritesCount, carbs, protein, fat, calcium, phosphorus, moisture, fiber, recipeId]
                                : [userId, title, targetPetType, foodCategory, cookingTimeLimit, level, caloriesPerServing, favoritesCount, carbs, protein, fat, calcium, phosphorus, moisture, fiber, recipeId]

        await db.query(
            `UPDATE RECIPES SET USER_ID=?, TITLE=?, ${ mainChange ? "MAIN_IMAGE_URL=?," : ""} TARGET_PET_TYPE=?, FOOD_CATEGORY=?, COOKING_TIME_LIMIT=?, LEVEL=?, CALORIES_PER_SERVING=?, FAVORITES_COUNT=?, NUTRITIONAL_INFO_CARBS_G=?, NUTRITIONAL_INFO_PROTEIN_G=?, NUTRITIONAL_INFO_FAT_G=?, NUTRITIONAL_INFO_CALCIUM_G=?, NUTRITIONAL_INFO_PHOSPHORUS_G=?, NUTRITIONAL_INFO_MOISTURE_PERCENT=?, NUTRITIONAL_INFO_FIBER_G=? WHERE ID=?`
            , update
        );

        await db.query('DELETE FROM RECIPE_INGREDIENTS WHERE RECIPE_ID=?', [recipeId]);

        if(ingredientsName && ingredientsAmount && ingredientsUnit && ingredientsName.length === ingredientsAmount.length && ingredientsUnit.length === ingredientsAmount.length){
            for(const index in ingredientsName){
                await db.query('INSERT INTO RECIPE_INGREDIENTS(RECIPE_ID, INGREDIENT_NAME, QUANTITY_AMOUNT, QUANTITY_UNIT) VALUES(?, ?, ?, ?)', [recipeId, ingredientsName[index], ingredientsAmount[index], ingredientsUnit[index]]);
            }
        }

        logger.info(`아이디 ${recipeId}가 변경되었습니다.`);
        return res.status(200).json({message : "레시피가 수정되었습니다."});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "레시피를 수정하는데 실패했습니다."});
    }
});

// 레시피 삭제
app.get("/removeRecipe/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [images] = await db.query("SELECT ID, IMAGE_URL FROM DESCRIPTION WHERE RECIPE_ID=?", [id]);

        for(let img of images){
            if(img.IMAGE_URL === null) continue;
            const relativePath = img.IMAGE_URL.split("/uploads/")[1];
            const filePath = path.join(UPLOAD_PATH, 'uploads', relativePath);

            if(fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await db.query("DELETE FROM DESCRIPTION WHERE RECIPE_ID=?", [id]);
        await db.query("DELETE FROM RECIPE_INGREDIENTS WHERE RECIPE_ID=?", [id]);

        await db.query("DELETE FROM RECIPES WHERE ID=?", [id]);

        logger.info(`아이디 ${id} 레시피 삭제 완료`);
        return res.status(200).json({message : "레시피가 삭제되었습니다."});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "레시피 삭제에 실패했습니다."});
    }
});


// 레시피 불러오기
app.get("/getRecipe/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [recipe] = await db.query("SELECT * FROM RECIPES WHERE ID=?", [id]);

        if(recipe.length === 0) return res.status(404).json({message : "레시피가 존재하지않습니다."});

        recipe[0]["VIEW_COUNT"] += 1;
        await db.query("UPDATE RECIPES SET VIEW_COUNT=? WHERE ID=?", [recipe[0]["VIEW_COUNT"], id]);

        const [description] = await db.query("SELECT * FROM DESCRIPTION WHERE RECIPE_ID=?",[id]);

        const [ingredient] = await db.query("SELECT * FROM RECIPE_INGREDIENTS WHERE RECIPE_ID=?", [id]);

        logger.info(`아이디 ${id} 레시피 불러오기`);
        return res.status(200).json({recipe : recipe[0], description : description, ingredient : ingredient});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "레시피를 불러오는데 실패했습니다."});
    }
});

// 레시피 상세 찾기
app.post("/searchRecipe", async (req, res) => {
    try {

        const { title, pet, food } = req.body;
        const check = [];
        if(pet) check.push(pet);
        if(food) check.push(food);
        const [rows] = await db.query(`SELECT * FROM RECIPES WHERE 1=1 ${title ? `AND TITLE LIKE '%${title}%'` : ""} ${pet ? ` AND TARGET_PET_TYPE=? ` : ""} ${food ? ` AND FOOD_CATEGORY IN (?)` : ""}`, check);

        logger.info("레시피 상세 찾기");
        return res.status(200).json({recipe : rows});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "레시피를 검색하는데 실패했습니다."});
    }
});

app.get("/getMyRecipe/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const [rows] = await db.query("SELECT ID, MAIN_IMAGE_URL, TITLE, VIEW_COUNT FROM RECIPES WHERE USER_ID=?", [userId]);

        if(rows.length === 0) return res.status(404).json({message : "레시피가 없습니다."});

        logger.info(`${userId}님의 나의 레시피를 불러옵니다.`);
        return res.status(200).json({recipe : rows});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "나의 레시피를 찾는데 실패했습니다."});
    }
});

/**
 * 리뷰
 */

// 리뷰 추가
app.post("/addReview", async (req, res) => {
    try {
        const { recipeId, userId, nickname, ratingScore, commentText } = req.body;

        await db.query("INSERT INTO REVIEWS(RECIPE_ID, USER_ID, NICKNAME RATING_SCORE, COMMENT_TEXT) VALUES(?, ?, ?, ?, ?)", [recipeId, userId, nickname, ratingScore, commentText]);

        logger.info(`${userId}님이 ${recipeId}에 리뷰를 등록했습니다.`);
        return res.status(200).json({message : "리뷰가 정상적으로 등록되었습니다."});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "리뷰 추가에 실패했습니다."});
    }
});

// 리뷰 가져오기
app.get("/getReview/:recipeId", async (req, res) => {
    try {
        const { recipeId } = req.params;

        const [rows] = await db.query("SELECT * FROM REVIEWS WHERE RECIPE_ID=?", [recipeId]);

        if(rows.length === 0) return res.status(404).json({error : "리뷰가 없습니다."});

        logger.info(`${recipeId}의 리뷰를 가져옵니다.`);
        return res.status(200).json({review : rows});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "리뷰 찾기를 실패했습니다"});
    }
});

// 리뷰 업데이트
app.post("/upDateReview", async (req, res) => {
    const { id, type, ratingScore, commentText } = req.body;
    try {
        type === "update" ? await db.query("UPDATE REVIEWS SET RATING_SCORE=?, COMMENT_TEXT=? WHERE ID=?", [ratingScore, commentText, id])
                          : type === "delete" ? await db.query("DELETE FROM REVIEWS WHERE ID=?", [id])
                          : null;

        logger.info(`리뷰 아이디 ${id}를 ${type === "update" ? "업데이트" : type === "delete" ? "삭제" : "비정상 접근을"} 했습니다.`);
        return res.status(200).json({message : type === "update" ? "업데이트 성공" : type === "delete" ? "삭제 성공" : "비정상 접근입니다."});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : `${type === "update" ? "리뷰 업데이트를 실패했습니다." : type === "delete" ? "리뷰 삭제를 실패했습니다." : "비정상 접근입니다."}`});
    }
});

app.get("/getMyReview/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const [rows] = await db.query("SELECT * FROM REVIEWS WHERE USER_ID=?", [userId]);

        if(rows.length === 0) return res.status(404).json({message : "리뷰가 없습니다."});

        logger.info(`${userId}님이 작성하신 리뷰를 가져옵니다.`);
        return res.status(200).json({reviews : rows});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "나의 리뷰를 가져오는데 실패했습니다."});
    }
})

/**
 * 즐겨찾기
 */

//즐겨찾기 추가
app.post("/addFavorites", async (req, res) => {
    try {
        const { userId, recipeId } = req.body;
        await db.query("INSERT INTO FAVORITES(USER_ID, RECIPE_ID) VALUES(?, ?)", [userId, recipeId]);

        logger.info(`${userId}님이 ${recipeId}를 즐겨찾기에 추가했습니다.`);
        return res.status(200).json({message : "즐겨찾기 추가"});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "즐겨찾기 추가를 실패했습니다."});
    }
});

//즐겨찾기 찾기
app.get("/getFavorites/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const [favorites] = await db.query("SELECT * FROM FAVORITES WHERE USER_ID=?", [userId]);

        const recipeIds = favorites.map(e => e.RECIPE_ID);

        const [recipes] = favorites.length > 0 ? await db.query(
            "SELECT ID, USER_ID, TITLE, MAIN_IMAGE_URL, VIEW_COUNT FROM RECIPES WHERE ID IN (?)",
            [recipeIds]
        ) : null;

        logger.info(`${userId}님의 즐겨찾기를 찾았습니다.`);

        return res.status(200).json({ favorites, recipes});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "즐겨찾기를 찾는데 실패했습니다."});
    }
});

//즐겨찾기 제거
app.get("/removeFavorites/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM FAVORITES WHERE ID=?", [id]);

        logger.info(`즐겨찾기 아이디 ${id} 삭제`);
        return res.status(200).json({message : "즐겨찾기 삭제"});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "즐겨찾기 삭제를 실패했습니다."});
    }
});

/**
 * 최근 본 레시피
 */

// 최근 본 레시피 추가
app.post("/addRecentlyView", async (req, res) => {
    try {
        const { userId, recipeId } = req.body;

        await db.query("INSERT INTO RECENTLY_VIEWED_RECIPES(USER_ID, RECIPE_ID) VALUES(?, ?)", [userId, recipeId]);

        logger.info(`${userId}님이 ${recipeId}를 봤습니다.`);
        return res.status(200).json({message : "최근 본 레시피 추가 완료"});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "서버에 문제가 발생했습니다."});
    }
});

// 최근 본 레시피 불러오기
app.get("/getRecentlyView/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const [recentlyView] = await db.query("SELECT * FROM RECENTLY_VIEWED_RECIPES WHERE USER_ID=?", [userId]);

        const recipeIds = recentlyView.map(e => e.RECIPE_ID);

        const [recipes] = recentlyView.length > 0 ? await db.query(
            "SELECT ID, USER_ID, TITLE, MAIN_IMAGE_URL, VIEW_COUNT FROM RECIPES WHERE ID IN (?)",
            [recipeIds]
        ) : null;

        logger.info(`${userId}님의 최근 본 레시피를 불러옵니다.`);
        return res.status(200).json({recentlyView, recipes});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "서버에 문제가 발생했습니다"});
    }
});

// 인기있는 5개의 레시피 보여주기
app.get("/getPopularity", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT ID, USER_ID, TITLE, MAIN_IMAGE_URL, VIEW_COUNT FROM RECIPES ORDER BY VIEW_COUNT DESC LIMIT 5");

        logger.info("인기있는 레시피 5개를 추출합니다.");
        return res.status(200).json({popularity : rows});
    } catch (error) {
        logger.error(error);
        return res.status(500).json({error : "서버에 문제가 발생했습니다."});
    }
})

https.createServer(options, app).listen(3333, () => logger.info("서버가 연결되었습니다."));

function authenticateToken(req, res, next) {
    const token = req.cookies.token;

    if(!token) return res.status(404).json({ message : "토큰이 없습니다."});

    return jwt.verify(token, jwtSecret, async (err, user) => {
        if(err) return res.status(401).json({ message : "유효하지 않은 토큰입니다."});

        const [nowToken] = await db.query("SELECT * FROM TOKEN_USER WHERE EMAIL=? AND TOKEN=?", [user.email, token]);

        if(nowToken.length === 0) {
            res.clearCookie('token');
            return res.status(401).json({message : "다른 곳에서 로그인을 시도했습니다.\n안전을 위해 로그아웃되었습니다."});
        }

        req.user = user;
        return next();
    })
}

function effectiveness(email, nickname, password){
    // 1. 아이디: 영문 소문자 + 숫자 조합, 5~20자, 특수문자 제외
    const idRegex = /^(?=.*[a-z])(?=.*\d)[a-z\d]{5,20}$/;

    // 2. 닉네임: 한글/영문/숫자 허용, 2~10자, 특수문자 제외
    const nicknameRegex = /^[가-힣A-Za-z0-9]{2,10}$/;

    // 3. 비밀번호: 영문 대/소문자 + 숫자 + 특수문자 포함, 8~20자
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/;

    if(email){
        if(!idRegex.test(email)){
            return true;
        }
    }

    if(nickname){
        if(!nicknameRegex.test(nickname)){
            return true;
        }
    }

    if(password){
        if(!passwordRegex.test(password)){
            return true;
        }
    }

    return false;
}