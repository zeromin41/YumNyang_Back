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

require('dotenv').config();
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

const storage = multer.diskStorage({
    destination : (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename : (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

/**
 * 회원 관리
 */

 // 회원가입
app.post("/signUp", async (req, res) => {
    const { email, nickname, password, name, type, age } = req.body;
    try {
        const hashPassword = await argon2.hash(password, {
            type : argon2.ArgonType.argon2id,
            timeCost : process.env.TIME_COST,
            memoryCost : 1 << process.env.MEMORY_COST,
            parallelism : process.env.PARALLELISM
        });

        const [result] = await db.execute('INSERT INTO USERS(EMAIL, PASSWORD, NICKNAME) VALUES(?, ?, ?)', [email, hashPassword, nickname]);

        if(!name && !type){
            if(!age) age = null;
            await db.query("INSERT INTO PETS(USER_ID, NAME, TYPE, AGE) VALUES(?, ?, ?, ?)", [result.ID, name, type, age]);
        }

        console.log(`${email}  회원가입 성공`);
        return res.status(200).json({message : "회원가입이 완료되었습니다."});
    } catch (error) {
        console.error(error)
        return res.status(500).json({error : "회원가입에 실패했습니다."})
    }
});

// 회원 탈퇴
app.post("/withdraw", async (req, res) => {
    const {id, email, password} = req.body;

    try {
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
        res.clearCookie('token');
        
        console.log(`${email}님이 회원을 탈퇴했습니다.`);
        return res.status(200).json({message : "회원탈퇴되었습니다."});

    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "회원탈퇴에 실패했습니다."});
    }
});

// 로그인
app.post("/login", async (req, res) => {
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

        await db.query('INSERT INTO TOKEN_USER(EMAIL, TOKEN) VALUES(?, ?) ON DUPLICATE KEY UPDATE TOKEN=?', [email, token, token]);

        res.cookie('token', token, {
            httpOnly : true,
            secure : process.env.NODE_ENV === 'production', // 정식일 땐 true로 교체
            sameSite : 'strict',
            maxAge : 30 * 60 * 1000
        });

        const id = rows[0].ID;
        const nickname = rows[0].NICKNAME;

        console.log(`${nickname}님이 로그인했습니다.`);
        return res.status(200).json({ message: `${nickname}님 환영합니다.`, number : id });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "로그인 중 오류가 발생했습니다." });
    }
});

// 회원 토큰 관리
app.get('/checkToken', authenticateToken, (req, res) => {
    try {
        const payload = { email : req.user.email};

        const newToken = jwt.sign(payload, jwtSecret, {expiresIn : '30m'});

        res.cookie('token', newToken, {
            httpOnly : true,
            secure : process.env.NODE_ENV === 'production', // 정식일 땐 true로 교체
            sameSite : 'strict',
            maxAge : 30 * 60 * 1000
        });

        console.log(`${payload.email}님의 token이 업데이트 되었습니다.`);

        return res.status(200).json({
            authenticated : true,
            user : req.user
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "비정상적 접근입니다."});
    }
});

// 로그아웃
app.post('/logout', authenticateToken, async (req, res) => {
    try {
        const email = req.user.email;

        await db.query("DELETE FROM TOKEN_USER WHERE EMAIL=?", [email]);

        res.clearCookie('token');
        
        console.log(`${email}님이 로그아웃했습니다.`);
        return res.status(200).json({message : "로그아웃되었습니다."});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "로그아웃에 실패했습니다."})
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
        console.error(error);
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

        if(!age) age = null;

        await db.query("INSERT INTO PETS(USER_ID, NAME, TYPE, AGE) VALUES(?, ?, ?, ?)", [userId, name, type, age]);

        console.log(`아이디 ${id}님의 펫 정보를 입력하였습니다.`);
        return res.status(200).json({message : "펫 정보가 입력되었습니다."});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "반려동물 정보를 입력하는데 실패했습니다."});
    }
});

//반려동물 정보 업데이트
app.post("/UpdatePetInfo", async (req, res) => {
    try {
        const { id, userId, name, type, age } = req.body;

        await db.query("UPDATE PETS SET NAME=?, TYPE=?, AGE=? WHERE ID=?", [name, type, age, id]);

        console.log(`아이디 ${userId}님의 펫 정보를 변경하였습니다.`);
        return res.status(200).json({message : "펫 정보가 변경되었습니다."});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "반려동물 정보를 변경하는데 실패했습니다."});
    }
});

// 반려동물 정보 가져오기
app.get("/getPetInfo/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const [rows] = await db.query("SELECT * FROM PETS USER_ID=?", [userId]);

        if(rows.length === 0) return res.status(404).json({message : "등록된 펫이 없습니다."});
        console.log(`${userId}님의 등록된 펫을 가져옵니다.`);
        return res.status(200).json({pets : rows});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "반려동물 정보를 가져오는데 실패했습니다."});
    }
});

// 반려동물 정보 삭제하기
app.post("/removePetInfo/:id", async (req, res) => {
    try {
        const { id } = req.params;

        await db.query("DELETE FROM PETS WHERE ID=?", [id]);

        console.log(`${id}를 삭제했습니다.`);
        return res.status(200).json({message : "반려동물 정보를 삭제했습니다."});
    } catch (error) {
        console.error(error);
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

        console.log("분류 코드 가져오기");
        return res.status(200).json({ test: cleanItems });
    } catch (error) {
        console.error(error);
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

        const test = await axios.get(`http://api.nongsaro.go.kr/service/feedRawMaterial/feedRawMaterialAllList?apiKey=${process.env.ANIMAL_FOOD_API}${upperListSel !== "" ? `&upperListSel=${upperListSel}` : ""}`);

        const jsonObj = parser.parse(test.data);

        const items = jsonObj.response.body.items.item;
        const cleanItems = items.map(i => {
            const obj = {};
            for(const [key, node] of Object.entries(i)){
                obj[key] = (node && typeof node === 'object' && 'value' in node) ? node.value : node;
            }

            return obj;
        });

        console.log("집밥원료 가져오기");
        return res.status(200).json({ test: cleanItems });
    } catch (error) {
        console.error(error);
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

        const urls = files.map(f =>
            `${req.protocol}://${req.hostname}/uploads/${f.filename}`
        );

        const mainImage = urls[0];
        const descriptionImage = urls.slice(1);
        
        const {userId, title, description, targetPetType, foodCategory, cookingTimeLimit, level, caloriesPerServing, favoritesCount, carbs, protein, fat, calcium, phosphorus, moisture, fiber} = req.body;
        const [result] = await db.execute(
            "INSERT INTO RECIPES(USER_ID, TITLE, MAIN_IMAGE_URL, TARGET_PET_TYPE, FOOD_CATEGORY, COOKING_TIME_LIMIT, LEVEL, CALORIES_PER_SERVING, FAVORITES_COUNT, NUTRITIONAL_INFO_CARBS_G, NUTRITIONAL_INFO_PROTEIN_G, NUTRITIONAL_INFO_FAT_G, NUTRITIONAL_INFO_CALCIUM_G, NUTRITIONAL_INFO_PHOSPHORUS_G, NUTRITIONAL_INFO_MOISTURE_PERCENT, NUTRITIONAL_INFO_FIBER_G) VALUE(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            , [userId, title, mainImage, targetPetType, foodCategory, cookingTimeLimit, level, caloriesPerServing, favoritesCount, carbs, protein, fat, calcium, phosphorus, moisture, fiber]
        );

        const values = descriptionImage.map((url, index) => [result.RECIPE_ID, index, description[index], url]);
        await db.query('INSERT INTO DESCRIPTION(RECIPE_ID, FLOW, DESCRIPTION, IMAGE_URL) VALUES ?', [values]);

        console.log("레시피 추가 완료");
        return res.status(200).json({message : "레시피 추가가 완료되었습니다."});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "레시피 추가에 실패했습니다."});
    }
});

// 레시피 수정
app.post("/updateRecipe", upload.array("newImages", 10), async (req, res) => {
    try {
        const recipeId = req.body.recipeId;
        const keepUrls = JSON.parse(req.body.keepUrls || '[]');
        const {userId, title, description, targetPetType, foodCategory, cookingTimeLimit, level, caloriesPerServing, favoritesCount, carbs, protein, fat, calcium, phosphorus, moisture, fiber, mainChange, descriptionChange} = req.body;

        const [existing] = await db.query("SELECT ID, FLOW, IMAGE_URL FROM DESCRIPTION WHERE RECIPE_ID=?", [recipeId]);

        const toDelete = existing.filter(img => !keepUrls.includes(img.url));

        for(let img of toDelete){
            const filePath = path.join(__dirname, img.url);

            fs.unlink(filePath, err => {
                if(err) console.error("delete file error", err);
            });
        }

        if(toDelete.length > 0){
            const ids = toDelete.map(i => i.id);

            await db.query("DELETE FROM DESCRIPTION WHERE ID IN (?)", [ids]);
        }

        const newFiles = req.files;
        const newUrls = newFiles.map(f => `${req.protocol}://${req.hostname}/uploads/${f.filename}`);

        const mainImage = mainChange ? newUrls[0] : null;
        const descriptionImage = newUrls.slice( mainChange ? 1 : 0);

        if(descriptionImage.length > 0){
            const values = descriptionImage.map((url) => [recipeId, descriptionChange[index], description[index], url]);

            await db.query('INSERT INTO DESCRIPTION(RECIPE_ID, FLOW, DESCRIPTION, IMAGE_URL) VALUES ?', [values]);
        }

        const update = mainChange ? [userId, title, mainImage, targetPetType, foodCategory, cookingTimeLimit, level, caloriesPerServing, favoritesCount, carbs, protein, fat, calcium, phosphorus, moisture, fiber, recipeId]
                                : [userId, title, targetPetType, foodCategory, cookingTimeLimit, level, caloriesPerServing, favoritesCount, carbs, protein, fat, calcium, phosphorus, moisture, fiber, recipeId]

        await db.query(
            `UPDATE RECIPES SET USER_ID=?, TITLE=?, ${ mainChange ? "MAIN_IMAGE_URL=?" : ""}, TARGET_PET_TYPE=?, FOOD_CATEGORY=?, COOKING_TIME_LIMIT=?, LEVEL=?, CALORIES_PER_SERVING=?, FAVORITES_COUNT=?, NUTRITIONAL_INFO_CARBS_G=?, NUTRITIONAL_INFO_PROTEIN_G=?, NUTRITIONAL_INFO_FAT_G=?, NUTRITIONAL_INFO_CALCIUM_G=?, NUTRITIONAL_INFO_PHOSPHORUS_G=?, NUTRITIONAL_INFO_MOISTURE_PERCENT=?, NUTRITIONAL_INFO_FIBER_G=? WHERE ID=?`
            , update
        );

        console.log(`아이디 ${recipeId}가 변경되었습니다.`);
        return res.status(200).json({message : "레시피가 수정되었습니다."});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "레시피를 수정하는데 실패했습니다."});
    }
});

// 레시피 삭제
app.get("/removeRecipe/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [images] = await db.query("SELECT ID, IMAGE_URL FROM DESCRIPTION WHERE RECIPE_ID=?", [id]);

        for(let img of images){
            const relativePath = img.url.split("/uploads/")[1];
            const filePath = path.join(__dirname, 'uploads', relativePath);

            if(fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        if(images.length > 0){
            const imageIds = images.map(i => i.id);

            await db.query("DELETE FROM DESCRIPTION WHERE ID IN (?)", [imageIds]);
        }

        await db.query("DELETE FROM RECIPES WHERE ID=?", [id]);

        console.log(`아이디 ${id} 레시피 삭제 완료`);
        return res.status(200).json({message : "레시피가 삭제되었습니다."});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "레시피 삭제에 실패했습니다."});
    }
});


// 레시피 불러오기
app.get("/getRecipe/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query("SELECT * FROM RECIPES WHERE ID=?", [id]);

        if(rows.length === 0) return res.status(404).json({message : "레시피가 존재하지않습니다."});

        rows[0]["VIEW_COUNT"] += 1;
        await db.query("UPDATE RECIPES SET VIEW_COUNT=? WHERE ID=?", [rows[0]["VIEW_COUNT"], id]);

        console.log(`아이디 ${id} 레시피 불러오기`);
        return res.status(200).json({recipe : rows[0]});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "레시피를 불러오는데 실패했습니다."});
    }
});

// 레시피 상세 찾기
app.post("/searchRecipe", async (req, res) => {
    try {
        const { pet, food, ingredient } = req.body;

        const [recipeIngredient] = ingredient ? await db.query("SELECT ID, USER_ID, TITLE, MAIN_IMAGE_URL, VIEW_COUNT FROM RECIPE_INGREDIENTS WHERE INGREDIENT_NAME=?", ingredient) : null;
        const check = [];
        if(pet) check.push(pet);
        if(food) check.push(food);
        const [rows] = await db.query(`SELECT * FROM RECIPES WHERE 1=1 ${pet ? `AND TARGET_PET_TYPE=?` : ""} ${food ? `AND FOOD_CATEGORY=?` : ""}`, check);

        const answer = recipeIngredient === null ? rows.filter(row => {
            for(let recipe of recipeIngredient){
                if(recipe["RECIPE_ID"] === row["ID"]) return true;
            }
            return false;
        }) : rows;

        console.log("레시피 상세 찾기");
        return res.status(200).json({recipe : answer});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "레시피를 검색하는데 실패했습니다."});
    }
});

app.get("/getMyRecipe/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const [rows] = await db.query("SELECT ID, MAIN_IMAGE_URL, TITLE FROM RECIPES WHERE USER_ID=?", [userId]);

        if(rows.length === 0) return res.status(404).json({message : "레시피가 없습니다."});

        console.log(`${userId}님의 나의 레시피를 불러옵니다.`);
        return res.status(200).json({recipe : rows});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "나의 레시피를 찾는데 실패했습니다."});
    }
});

/**
 * 리뷰
 */

// 리뷰 추가
app.post("/addReview", async (req, res) => {
    try {
        const { recipeId, userId, ratingScore, commentText } = req.body;

        await db.query("INSERT INTO REVIEWS(RECIPE_ID, USER_ID, RATING_SCORE, COMMENT_TEXT) VALUES(?, ?, ?, ?)", [recipeId, userId, ratingScore, commentText]);

        console.log(`${userId}님이 ${recipeId}에 리뷰를 등록했습니다.`);
        return res.status(200).json({message : "리뷰가 정상적으로 등록되었습니다."});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "리뷰 추가에 실패했습니다."});
    }
});

// 리뷰 가져오기
app.get("/getReview/:recipeId", async (req, res) => {
    try {
        const { recipeId } = req.params;

        const [rows] = await db.query("SELECT * FROM REVIEWS FROM RECIPE_ID=?", [recipeId]);

        if(rows.length === 0) return res.status(404).json({error : "리뷰가 없습니다."});

        console.log(`${recipeId}의 리뷰를 가져옵니다.`);
        return res.status(200).json({review : rows});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "리뷰 찾기를 실패했습니다"});
    }
});

// 리뷰 업데이트
app.post("/upDateReview", async (req, res) => {
    const { id, type, ratingScore, commentText } = req.body;
    try {
        type === "update" ? await db.query("UPDATE REVIEWS SET RATING_SCORE=? AND COMMENT_TEXT=? FROM WHERE ID=?", [ratingScore, commentText, id])
                          : type === "delete" ? await db.query("DELETE FROM REVIEWS WHERE ID=?", [id])
                          : null;

        console.log(`리뷰 아이디 ${id}를 ${type === "update" ? "업데이트" : type === "delete" ? "삭제" : "비정상 접근을"} 했습니다.`);
        return res.status(200).json({message : type === "update" ? "업데이트 성공" : type === "delete" ? "삭제 성공" : "비정상 접근입니다."});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : `${type === "update" ? "리뷰 업데이트를 실패했습니다." : type === "delete" ? "리뷰 삭제를 실패했습니다." : "비정상 접근입니다."}`});
    }
});

app.get("/getMyReview/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const [rows] = await db.query("SELECT * FROM REVIEWS WHERE USER_ID=?", [userId]);

        if(rows.length === 0) return res.status(404).json({message : "리뷰가 없습니다."});

        console.log(`${userId}님이 작성하신 리뷰를 가져옵니다.`);
        return res.status(200).json({reviews : rows});
    } catch (error) {
        console.error(error);
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

        console.log(`${userId}님이 ${recipeId}를 즐겨찾기에 추가했습니다.`);
        return res.status(200).json({message : "즐겨찾기 추가"});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "즐겨찾기 추가를 실패했습니다."});
    }
});

//즐겨찾기 찾기
app.get("/getFavorites/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const [rows] = await db.query("SELECT * FROM FAVORITES WHERE USERID=?", [userId]);

        console.log(`${userId}님의 즐겨찾기를 찾았습니다.`);
        return res.status(200).json({favorites : rows});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "즐겨찾기를 찾는데 실패했습니다."});
    }
});

//즐겨찾기 제거
app.get("/removeFavorites/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM FAVORITES WHERE ID=?", [id]);

        console.log(`즐겨찾기 아이디 ${id} 삭제`);
        return res.status(200).json({message : "즐겨찾기 삭제"});
    } catch (error) {
        console.error(error);
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

        console.log(`${userId}님이 ${recipeId}를 봤습니다.`);
        return res.status(200).json({message : "최근 본 레시피 추가 완료"});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "서버에 문제가 발생했습니다."});
    }
});

// 최근 본 레시피 불러오기
app.get("/getRecentlyView/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const [rows] = await db.query("SELECT * FROM RECENTLY_VIEWED_RECIPES WHERE USER_ID=?", userId);

        console.log(`${userId}님의 최근 본 레시피를 불러옵니다.`);
        return res.status(200).json({recentlyView : rows});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "서버에 문제가 발생했습니다"});
    }
});

// 인기있는 5개의 레시피 보여주기
app.get("/getPopularity", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT ID, USER_ID, TITLE, MAIN_IMAGE_URL, VIEW_COUNT FROM RECIPES ORDER BY VIEW_COUNT DESC LIMIT 5");

        console.log("인기있는 레시피 5개를 추출합니다.");
        return res.status(200).json({popularity : rows});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error : "서버에 문제가 발생했습니다."});
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