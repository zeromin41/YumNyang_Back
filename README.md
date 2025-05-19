# YumNyang_Back

먹었냥 프로젝트 백엔드

## 🚀 목차

1. [프로젝트 소개](#프로젝트-소개)
2. [기술 스택](#기술-스택)
3. [설치 및 실행](#설치-및-실행)
4. [환경 변수](#환경-변수)
5. [로깅](#로깅)
6. [API 엔드포인트](#api-엔드포인트)
   - [인증(Authentication)](#인증authentication)
   - [회원(User)](#회원user)
   - [반려동물(Pet)](#반려동물pet)
   - [분류 & 원료(Category & Ingredient)](#분류--원료category--ingredient)
   - [레시피(Recipe)](#레시피recipe)
   - [리뷰(Review)](#리뷰review)
   - [즐겨찾기(Favorites)](#즐겨찾기favorites)
   - [최근 본 레시피(Recently Viewed)](#최근-본-레시피recently-viewed)
   - [인기 레시피(Popularity)](#인기-레시피popularity)
7. [에러 처리](#에러-처리)
8. [라이선스](#라이선스)

---

## 프로젝트 소개

`YumNyang_Back`은 반려동물을 위한 집밥 레시피 공유 플랫폼 '먹었냥'의 백엔드 서버입니다.  
Express.js와 MariaDB를 기반으로 JWT 인증, 이미지 업로드, 외부 XML API 연동 기능을 제공합니다.

---

## 기술 스택

- Node.js v18+
- Express v4+
- MariaDB (mysql2/promise)
- JWT (jsonwebtoken)
- Argon2 (@node-rs/argon2)
- Multer (파일 업로드)
- Fast-XML-Parser (XML → JSON 변환)
- Winston & DailyRotateFile (로깅)
- HTTPS (Self-signed 또는 CA 인증서)

---

## 설치 및 실행

1. **레포지토리 클론**
   ```bash
   git clone https://github.com/zeromin41/YumNyang_Back.git
   cd YumNyang_Back
   ```
2. **의존성 설치**
   ```bash
   npm install
   ```
3. **환경 변수 설정**  
   프로젝트 루트에 `.env` 파일을 생성하고 아래 값을 설정하세요.
   ```dotenv
   PORT=3333
   DB_HOST=your_db_host
   DB_PORT=3306
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_SCHEMA=your_db_schema
   JWT_SECRET=your_jwt_secret
   TIME_COST=3
   MEMORY_COST=12
   PARALLELISM=1
   UPLOAD_PATH=/absolute/path/to/uploads
   HTTPS_KEY=/absolute/path/to/your.key
   HTTPS_CERT=/absolute/path/to/your.crt
   HTTPS_CA=/absolute/path/to/ca_bundle.crt
   ANIMAL_FOOD_API=your_nongsaro_api_key
   ```
4. **서버 실행**
   ```bash
   npm start
   ```
   또는 HTTPS 옵션을 사용하려면:
   ```bash
   node server.js
   ```

---

## 환경 변수

| 변수명          | 설명                            | 예시                         |
| --------------- | ------------------------------- | ---------------------------- |
| PORT            | 서버 포트                       | 3333                         |
| DB_HOST         | MariaDB 호스트                  | localhost                    |
| DB_PORT         | MariaDB 포트                    | 3306                         |
| DB_USER         | MariaDB 사용자                  | root                         |
| DB_PASSWORD     | MariaDB 비밀번호                | password123                  |
| DB_SCHEMA       | 데이터베이스 스키마             | yumnyang                     |
| JWT_SECRET      | JWT 서명 비밀키                 | supersecretkey               |
| TIME_COST       | Argon2 시간 비용                | 3                            |
| MEMORY_COST     | Argon2 메모리 비용 (2^n MiB)    | 12                           |
| PARALLELISM     | Argon2 병렬 처리 개수           | 1                            |
| UPLOAD_PATH     | 업로드 파일 저장 기본 경로      | /var/www/yumnyang/uploads    |
| HTTPS_KEY       | HTTPS 개인키 파일 경로          | /etc/ssl/private/key.pem     |
| HTTPS_CERT      | HTTPS 인증서 파일 경로          | /etc/ssl/certs/cert.pem      |
| HTTPS_CA        | HTTPS CA 번들 파일 경로         | /etc/ssl/certs/ca_bundle.pem |
| ANIMAL_FOOD_API | 농림축산검역본부(농사로) API 키 | ABCDEFGHIJKL                 |

---

## 로깅

- Winston과 DailyRotateFile을 사용하여 `logs/YYYY-MM-DD.log` 형태로 로그를 보관합니다.
- 콘솔에도 로그가 출력되며, 기본 레벨은 `info`입니다.

---

## API 엔드포인트

모든 요청 기본 URL: `https://{HOST}:{PORT}`  
JWT 인증이 필요한 엔드포인트는 `Cookie: token=<JWT>` 헤더를 포함해야 합니다.

### 인증 (Authentication)

<details>
<summary><code>POST /signUp</code></summary>

- **설명**: 신규 사용자 회원가입
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "email": "user1234",
    "nickname": "뽀삐",
    "password": "P@ssw0rd!",
    "name": "댕댕이",
    "type": "dog",
    "age": 3
  }
  ```
- **Responses**:
  - `200 OK`
    ```json
    { "message": "회원가입이 완료되었습니다." }
    ```
  - `404 Bad Request`
    ```json
    { "message": "올바르지못한 형식입니다." }
    ```
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>POST /login</code></summary>

- **설명**: 로그인 후 JWT 발급 및 쿠키 설정 (30분)
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  { "email": "user1234", "password": "P@ssw0rd!" }
  ```
- **Responses**:
  - `200 OK`
    ```json
    { "message": "nick님 환영합니다.", "number": 1 }
    ```
  - `404 Not Found`
  - `401 Unauthorized`
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>GET /checkToken</code></summary>

- **설명**: 토큰 검증 및 갱신 (쿠키 재설정)
- **Headers**: `Cookie: token=<JWT>`
- **Responses**:
  - `200 OK`
    ```json
    { "authenticated": true, "user": { "email": "user@example.com" } }
    ```
  - `401 Unauthorized`
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>POST /logout</code></summary>

- **설명**: 로그아웃 (토큰 삭제)
- **Headers**: `Cookie: token=<JWT>`
- **Responses**:
  - `200 OK`
    ```json
    { "message": "로그아웃되었습니다." }
    ```
  - `500 Internal Server Error`
  </details>

### 회원 (User)

<details>
<summary><code>POST /checkId</code></summary>
- **설명**: 이메일(아이디) 중복 확인  
- **Content-Type**: `application/json`  
- **Request Body**:
  ```json
  { "email": "user@example.com" }
  ```
- **Responses**:
  - `200 OK` `{ "message": "사용가능한 아이디입니다." }`
  - `404 Not Found` `{ "message": "존재하는 아이디입니다." }`
  - `500 Internal Server Error` `{ "error": "서버에 문제가 발생했습니다." }`
</details>

<details>
<summary><code>POST /checkNickname</code></summary>
- **설명**: 닉네임 중복 확인  
- **Content-Type**: `application/json`  
- **Request Body**:
  ```json
  { "nickname": "nickname" }
  ```
- **Responses**:
  - `200 OK` `{ "message": "사용가능한 닉네임입니다." }`
  - `404 Not Found` `{ "message": "존재하는 닉네임입니다." }`
  - `500 Internal Server Error` `{ "error": "서버에 문제가 발생했습니다." }`
</details>

<details>
<summary><code>POST /withdraw</code></summary>
- **설명**: 회원 탈퇴  
- **Content-Type**: `application/json`  
- **Request Body**:
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "password": "plain_password"
  }
  ```
- **Responses**:
  - `200 OK` `{ "message": "회원탈퇴되었습니다." }`
  - `404 Bad Request` `{ "message": "올바르지못한 형식입니다." }`
  - `500 Internal Server Error` `{ "error": "회원탈퇴에 실패했습니다." }`
</details>

<details>
<summary><code>POST /passwordCheck</code></summary>
- **설명**: 비밀번호 확인  
- **Content-Type**: `application/json`  
- **Request Body**:
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "password": "plain_password"
  }
  ```
- **Responses**:
  - `200 OK` `{ "message": "비밀번호가 확인되었습니다." }`
  - `404 Not Found` `{ "message": "패스워드가 올바르지않습니다." }`
  - `500 Internal Server Error` `{ "error": "서버에 오류가 발생했습니다." }`
</details>

<details>
<summary><code>POST /changeUserInfo</code></summary>
- **설명**: 닉네임/비밀번호 변경  
- **Content-Type**: `application/json`  
- **Request Body**:
  ```json
  { "id": 1, "nickname": "newNick", "password": "newP@ss1" }
  ```
- **Responses**:
  - `200 OK` `{ "message": "회원정보 변경이 완료되었습니다." }`
  - `500 Internal Server Error` `{ "error": "회원 정보 변경에 실패했습니다." }`
</details>

<details>
<summary><code>GET /getUserNickname/:id</code></summary>
- **설명**: 사용자 닉네임 조회  
- **Responses**:
  - `200 OK` `{ "nickname": "userNickname" }`
  - `404 Not Found` `{ "message": "유저가 존재하지않습니다." }`
  - `500 Internal Server Error` `{ "error": "유저 정보를 가져오는데 실패했습니다." }`
</details>

---

### 반려동물 (Pet)

<details>
<summary><code>POST /addPetInfo</code></summary>
- **설명**: 반려동물 정보 등록  
- **Content-Type**: `application/json`  
- **Request Body**:
  ```json
  {
    "userId": 1,
    "name": "뽀삐",
    "type": "dog",
    "age": 3
  }
  ```
- **Responses**:
  - `200 OK` `{ "message": "펫 정보가 입력되었습니다." }`
  - `500 Internal Server Error` `{ "error": "반려동물 정보를 입력하는데 실패했습니다." }`
</details>

<details>
<summary><code>POST /UpdatePetInfo</code></summary>
- **설명**: 반려동물 정보 수정  
- **Content-Type**: `application/json`  
- **Request Body**:
  ```json
  {
    "id": 10,
    "userId": 1,
    "name": "뽀삐",
    "type": "dog",
    "age": 4
  }
  ```
- **Responses**:
  - `200 OK` `{ "message": "펫 정보가 변경되었습니다." }`
  - `500 Internal Server Error` `{ "error": "반려동물 정보를 변경하는데 실패했습니다." }`
</details>

<details>
<summary><code>GET /getPetInfo/:userId</code></summary>
- **설명**: 반려동물 목록 조회  
- **Responses**:
  - `200 OK` `{ "pets": [ /* 배열 */ ] }`
  - `404 Not Found` `{ "message": "등록된 펫이 없습니다." }`
  - `500 Internal Server Error` `{ "error": "반려동물 정보를 가져오는데 실패했습니다." }`
</details>

<details>
<summary><code>POST /removePetInfo/:id</code></summary>
- **설명**: 반려동물 삭제  
- **Responses**:
  - `200 OK` `{ "message": "반려동물 정보를 삭제했습니다." }`
  - `500 Internal Server Error` `{ "error": "반려동물 정보를 삭제하는데 실패했습니다." }`
</details>

---

### 분류 & 원료 (Category & Ingredient)

<details>
<summary><code>GET /getCategory</code></summary>
- **설명**: 대분류 코드 조회 (XML → JSON)  
- **Responses**:
  - `200 OK`  
    ```json
    { "category": [ { "code": "402001", "codeNm": "농산물" }, ... ] }
    ```
  - `500 Internal Server Error`
</details>

<details>
<summary><code>POST /getIngredient</code></summary>
- **설명**: 상세 원료 조회 (XML → JSON)  
- **Content-Type**: `application/json`  
- **Request Body**:
  ```json
  { "upperListSel": "402003" }
  ```
- **Responses**:
  - `200 OK` `{ "ingredient": [ /* 배열 */ ] }`
  - `500 Internal Server Error`
</details>

---

### 레시피 (Recipe)

<details>
<summary><code>POST /AddRecipe</code></summary>
- **설명**: 레시피 추가 (이미지 최대 10장)  
- **Content-Type**: `multipart/form-data`  
- **Form Data**:
  - `images[]`: 파일 (최대 10개)  
  - `userId, nickname, title, targetPetType, foodCategory, cookingTimeLimit, level, caloriesPerServing, favoritesCount, carbs, protein, fat, calcium, phosphorus, moisture, fiber, nacl, ptss`  
  - `descriptionJSON` (단계별 설명 배열 JSON)  
  - `ingredientsNameJSON, ingredientsAmountJSON, ingredientsUnitJSON` (원료 배열 JSON)  
- **Responses**:
  - `200 OK` `{ "message": "레시피 추가가 완료되었습니다." }`
  - `500 Internal Server Error`
</details>

<details>
<summary><code>POST /updateRecipe</code></summary>
- **설명**: 레시피 수정 (이미지 보관 및 교체)  
- **Content-Type**: `multipart/form-data`  
- **Form Data**:  
  - `recipeId`  
  - `keepUrls` (유지할 기존 이미지 URL 배열 JSON)  
  - `newImages[]` (새로운 이미지 파일 최대 10개)  
  - 기타 레시피 필드(`title, targetPetType, ...`) 및 `mainChange, descriptionChange[], description[]`, `ingredientsName, ingredientsAmount, ingredientsUnit`  
- **Responses**:
  - `200 OK` `{ "message": "레시피가 수정되었습니다." }`
  - `500 Internal Server Error`
</details>

<details>
<summary><code>GET /getRecipe/:id</code></summary>
- **설명**: 레시피 상세 조회 (조회수 증가)  
- **Responses**:
  - `200 OK`  
    ```json
    {
      "recipe": { /* RECIPES */ },
      "description": [ /* DESCRIPTION */ ],
      "ingredient": [ /* INGREDIENT */ ]
    }
    ```
  - `404 Not Found` `{ "message": "레시피가 존재하지않습니다." }`
  - `500 Internal Server Error`
</details>

<details>
<summary><code>GET /removeRecipe/:id</code></summary>
- **설명**: 레시피 삭제 (이미지 파일 포함)  
- **Responses**:
  - `200 OK` `{ "message": "레시피가 삭제되었습니다." }`
  - `500 Internal Server Error`
</details>

<details>
<summary><code>POST /searchRecipe</code></summary>
- **설명**: 레시피 검색 (제목, 반려동물, 분류)  
- **Content-Type**: `application/json`  
- **Request Body**:
  ```json
  { "title": "연어", "pet": "dog", "food": "수산물" }
  ```
- **Responses**:
  - `200 OK` `{ "recipe": [ /* 배열 */ ] }`
  - `500 Internal Server Error`
</details>

<details>
<summary><code>GET /getMyRecipe/:userId</code></summary>
- **설명**: 사용자별 레시피 목록 조회  
- **Responses**:
  - `200 OK` `{ "recipe": [ { "ID", "MAIN_IMAGE_URL", "TITLE" }, ... ] }`
  - `404 Not Found` `{ "message": "레시피가 없습니다." }`
  - `500 Internal Server Error`
</details>

---

### 리뷰 (Review)

<details>
<summary><code>POST /addReview</code></summary>
- **설명**: 리뷰 추가  
- **Content-Type**: `application/json`  
- **Request Body**:
  ```json
  { "recipeId": 1, "userId": 2, "nickname": "nick", "ratingScore": 4, "commentText": "맛있어요!" }
  ```
- **Responses**:
  - `200 OK` `{ "message": "리뷰가 정상적으로 등록되었습니다." }`
  - `500 Internal Server Error`
</details>

<details>
<summary><code>GET /getReview/:recipeId</code></summary>
- **설명**: 레시피별 리뷰 조회  
- **Responses**:
  - `200 OK` `{ "review": [ /* 배열 */ ] }`
  - `404 Not Found` `{ "error": "리뷰가 없습니다." }`
  - `500 Internal Server Error`
</details>

<details>
<summary><code>POST /upDateReview</code></summary>
- **설명**: 리뷰 수정/삭제  
- **Content-Type**: `application/json`  
- **Request Body**:
  ```json
  { "id": 5, "type": "update", "ratingScore": 3, "commentText": "괜찮아요" }
  ```
- **Responses**:
  - `200 OK` `{ "message": "업데이트 성공" }` or `{ "message": "삭제 성공" }`
  - `500 Internal Server Error`
</details>

<details>
<summary><code>GET /getMyReview/:userId</code></summary>
- **설명**: 사용자별 리뷰 조회  
- **Responses**:
  - `200 OK` `{ "reviews": [ /* 배열 */ ] }`
  - `404 Not Found` `{ "message": "리뷰가 없습니다." }`
  - `500 Internal Server Error`
</details>

---

### 즐겨찾기 & 최근 본 & 인기

<details>
<summary><code>POST /addFavorites</code></summary>
- **설명**: 즐겨찾기 추가  
- **Content-Type**: `application/json`  
- **Request Body**:
  ```json
  { "userId": 2, "recipeId": 1 }
  ```
- **Responses**:
  - `200 OK` `{ "message": "즐겨찾기 추가" }`
  - `500 Internal Server Error`
</details>

<details>
<summary><code>GET /getFavorites/:userId</code></summary>
- **설명**: 즐겨찾기 조회  
- **Responses**:
  - `200 OK` `{ "favorites": [ /* 배열 */ ], "recipes": [ /* 배열 */ ] }`
  - `500 Internal Server Error`
</details>

<details>
<summary><code>GET /removeFavorites/:id</code></summary>
- **설명**: 즐겨찾기 삭제  
- **Responses**:
  - `200 OK` `{ "message": "즐겨찾기 삭제" }`
  - `500 Internal Server Error`
</details>

<details>
<summary><code>POST /addRecentlyView</code></summary>
- **설명**: 최근 본 레시피 추가  
- **Content-Type**: `application/json`  
- **Request Body**:
  ```json
  { "userId": 2, "recipeId": 1 }
  ```
- **Responses**:
  - `200 OK` `{ "message": "최근 본 레시피 추가 완료" }`
  - `500 Internal Server Error`
</details>

<details>
<summary><code>GET /getRecentlyView/:userId</code></summary>
- **설명**: 최근 본 레시피 조회  
- **Responses**:
  - `200 OK` `{ "recentlyView": [ /* 배열 */ ], "recipes": [ /* 배열 */ ] }`
  - `500 Internal Server Error`
</details>

<details>
<summary><code>GET /getPopularity</code></summary>
- **설명**: 상위 5개 인기 레시피 조회  
- **Responses**:
  - `200 OK` `{ "popularity": [ /* 배열 */ ] }`
  - `500 Internal Server Error`
</details>
