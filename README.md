# YumNyang_Back

먹었냥 프로젝트 백엔드

## 🚀 목차

1. [프로젝트 소개](#프로젝트-소개)
2. [기술 스택](#기술-스택)
3. [설치 및 실행](#설치-및-실행)
4. [환경 변수](#환경-변수)
5. [로깅](#로깅)
6. [API 엔드포인트](#api-엔드포인트)
   - [인증 (Authentication)](#인증-authentication)
   - [회원 (User)](#회원-user)
   - [반려동물 (Pet)](#반려동물-pet)
   - [분류 & 원료 (Category & Ingredient)](#분류--원료-category--ingredient)
   - [레시피 (Recipe)](#레시피-recipe)
   - [리뷰 (Review)](#리뷰-review)
   - [즐겨찾기 (Favorites)](#즐겨찾기-favorites)
   - [최근 본 레시피 (Recently Viewed)](#최근-본-레시피-recently-viewed)
   - [인기 레시피 (Popularity)](#인기-레시피-popularity)
7. [에러 처리](#에러-처리)
8. [라이선스](#라이선스)

---

## 프로젝트 소개

`YumNyang_Back`은 반려동물을 위한 집밥 레시피 공유 플랫폼 '먹었냥'의 백엔드 서버입니다.  
Express.js와 MariaDB 기반으로 JWT 인증, 이미지 업로드, 외부 XML API 연동 기능을 제공합니다.

---

## 기술 스택

- **Node.js** v18+
- **Express** v4+
- **MariaDB** (mysql2/promise)
- **JWT** (jsonwebtoken)
- **Argon2** (@node-rs/argon2)
- **Multer** (파일 업로드)
- **Fast-XML-Parser** (XML → JSON 변환)
- **Winston & DailyRotateFile** (로깅)
- **HTTPS** (Self-signed 또는 CA 인증서)

---

## 설치 및 실행

1. 레포지토리 클론
   ```bash
   git clone https://github.com/zeromin41/YumNyang_Back.git
   cd YumNyang_Back
   ```
2. 의존성 설치
   ```bash
   npm install
   ```
3. 환경 변수 설정  
   프로젝트 루트에 `.env` 파일을 생성하고 다음 값을 입력합니다:
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
4. 서버 실행
   ```bash
   npm start
   ```
   또는 HTTPS 옵션:
   ```bash
   node server.js
   ```

---

## 환경 변수

| 변수명            | 설명                            | 예시                           |
| ----------------- | ------------------------------- | ------------------------------ |
| `PORT`            | 서버 포트                       | `3333`                         |
| `DB_HOST`         | MariaDB 호스트                  | `localhost`                    |
| `DB_PORT`         | MariaDB 포트                    | `3306`                         |
| `DB_USER`         | MariaDB 사용자                  | `root`                         |
| `DB_PASSWORD`     | MariaDB 비밀번호                | `password123`                  |
| `DB_SCHEMA`       | 데이터베이스 스키마             | `yumnyang`                     |
| `JWT_SECRET`      | JWT 서명 비밀키                 | `supersecretkey`               |
| `TIME_COST`       | Argon2 시간 비용                | `3`                            |
| `MEMORY_COST`     | Argon2 메모리 비용 (2^n MiB)    | `12`                           |
| `PARALLELISM`     | Argon2 병렬 처리 개수           | `1`                            |
| `UPLOAD_PATH`     | 파일 업로드 경로                | `/var/www/yumnyang/uploads`    |
| `HTTPS_KEY`       | HTTPS 개인키 파일 경로          | `/etc/ssl/private/key.pem`     |
| `HTTPS_CERT`      | HTTPS 인증서 파일 경로          | `/etc/ssl/certs/cert.pem`      |
| `HTTPS_CA`        | HTTPS CA 번들 파일 경로         | `/etc/ssl/certs/ca_bundle.pem` |
| `ANIMAL_FOOD_API` | 농림축산검역본부(농사로) API 키 | `ABCDEFGHIJKL`                 |

---

## 로깅

- Winston과 DailyRotateFile을 사용하여 `logs/YYYY-MM-DD.log` 형태로 로그를 보관합니다.
- 콘솔에 `info` 레벨 이상 로그를 출력합니다.

---

## API 엔드포인트

기본 URL: `https://{HOST}:{PORT}`  
JWT 인증이 필요한 요청은 `Cookie: token=<JWT>` 헤더를 포함하세요.

### 인증 (Authentication)

<details>
<summary><code>POST /signUp</code></summary>

- 설명: 신규 사용자 회원가입
- Content-Type: `application/json`
- Request Body:
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
- Responses:
  - `200 OK`
    ```json
    { "message": "회원가입이 완료되었습니다." }
    ```
  - `400 Bad Request`
    ```json
    { "message": "유효하지 않은 입력입니다." }
    ```
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>POST /login</code></summary>

- 설명: 로그인 후 JWT 발급 및 쿠키 설정 (30분)
- Content-Type: `application/json`
- Request Body:
  ```json
  { "email": "user1234", "password": "P@ssw0rd!" }
  ```
- Responses:
  - `200 OK`
    ```json
    { "message": "nick님 환영합니다.", "userId": 1 }
    ```
  - `401 Unauthorized`
    ```json
    { "message": "인증에 실패했습니다." }
    ```
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>GET /checkToken</code></summary>

- 설명: 토큰 검증 및 갱신
- Headers: `Cookie: token=<JWT>`
- Responses:
  - `200 OK`
    ```json
    { "authenticated": true, "user": { "email": "user@example.com" } }
    ```
  - `401 Unauthorized`
    ```json
    { "message": "토큰이 만료되었거나 유효하지 않습니다." }
    ```
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>POST /logout</code></summary>

- 설명: 로그아웃 (JWT 삭제)
- Headers: `Cookie: token=<JWT>`
- Responses:
  - `200 OK`
    ```json
    { "message": "로그아웃되었습니다." }
    ```
  - `500 Internal Server Error`
  </details>

### 회원 (User)

<details>
<summary><code>POST /checkId</code></summary>

- 설명: 이메일(아이디) 중복 확인
- Request Body:
  ```json
  { "email": "user@example.com" }
  ```
- Responses:
  - `200 OK` `{ "message": "사용 가능한 아이디입니다." }`
  - `409 Conflict` `{ "message": "이미 사용 중인 아이디입니다." }`
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>POST /checkNickname</code></summary>

- 설명: 닉네임 중복 확인
- Request Body:
  ```json
  { "nickname": "nickname" }
  ```
- Responses:
  - `200 OK` `{ "message": "사용 가능한 닉네임입니다." }`
  - `409 Conflict` `{ "message": "이미 사용 중인 닉네임입니다." }`
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>POST /withdraw</code></summary>

- 설명: 회원 탈퇴
- Request Body:
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "password": "plain_password"
  }
  ```
- Responses:
  - `200 OK` `{ "message": "회원 탈퇴되었습니다." }`
  - `400 Bad Request` `{ "message": "요청 형식이 잘못되었습니다." }`
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>POST /passwordCheck</code></summary>

- 설명: 비밀번호 확인
- Request Body:
  ```json
  {
    "id": 1,
    "password": "plain_password"
  }
  ```
- Responses:
  - `200 OK` `{ "message": "비밀번호가 일치합니다." }`
  - `401 Unauthorized` `{ "message": "비밀번호가 일치하지 않습니다." }`
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>POST /changeUserInfo</code></summary>

- 설명: 닉네임/비밀번호 변경
- Request Body:
  ```json
  { "id": 1, "nickname": "newNick", "password": "newP@ss1" }
  ```
- Responses:
  - `200 OK` `{ "message": "회원 정보가 변경되었습니다." }`
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>GET /getUserNickname/:id</code></summary>

- 설명: 사용자 닉네임 조회
- Responses:
  - `200 OK` `{ "nickname": "userNickname" }`
  - `404 Not Found` `{ "message": "사용자를 찾을 수 없습니다." }`
  - `500 Internal Server Error`
  </details>

### 반려동물 (Pet)

<details>
<summary><code>POST /addPetInfo</code></summary>

- 설명: 반려동물 정보 등록
- Request Body:
  ```json
  {
    "userId": 1,
    "name": "뽀삐",
    "type": "dog",
    "age": 3
  }
  ```
- Responses:
  - `201 Created` `{ "message": "반려동물 정보가 등록되었습니다." }`
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>PUT /updatePetInfo</code></summary>

- 설명: 반려동물 정보 수정
- Request Body:
  ```json
  {
    "id": 10,
    "name": "뽀삐",
    "type": "dog",
    "age": 4
  }
  ```
- Responses:
  - `200 OK` `{ "message": "반려동물 정보가 수정되었습니다." }`
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>GET /getPetInfo/:userId</code></summary>

- 설명: 반려동물 목록 조회
- Responses:
  - `200 OK` `{ "pets": [ /* 배열 */ ] }`
  - `404 Not Found` `{ "message": "등록된 반려동물이 없습니다." }`
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>DELETE /removePetInfo/:id</code></summary>

- 설명: 반려동물 삭제
- Responses:
  - `200 OK` `{ "message": "반려동물 정보가 삭제되었습니다." }`
  - `500 Internal Server Error`
  </details>

### 분류 & 원료 (Category & Ingredient)

<details>
<summary><code>GET /getCategory</code></summary>

- 설명: 대분류 코드 조회 (XML → JSON)
- Responses:
  - `200 OK`
    ```json
    { "category": [ { "code": "402001", "codeNm": "농산물" }, ... ] }
    ```
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>POST /getIngredient</code></summary>

- 설명: 상세 원료 조회 (XML → JSON)
- Request Body:
  ```json
  { "upperListSel": "402003" }
  ```
- Responses:
  - `200 OK` `{ "ingredient": [ /* 배열 */ ] }`
  - `500 Internal Server Error`
  </details>

### 레시피 (Recipe)

<details>
<summary><code>POST /recipes</code></summary>

- 설명: 레시피 추가 (이미지 최대 10장)
- Content-Type: `multipart/form-data`
- Form Data:
  - `images[]`: 파일 최대 10개
  - `userId, title, targetPetType, foodCategory, cookingTimeLimit, level, caloriesPerServing, favoritesCount, carbs, protein, fat, calcium, phosphorus, moisture, fiber, nacl, ptss`
  - `descriptionJSON` (단계별 설명 배열 JSON)
  - `ingredientsJSON` (원료명, 수량, 단위 배열 JSON)
- Responses:
  - `201 Created` `{ "message": "레시피가 등록되었습니다." }`
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>PUT /recipes/:id</code></summary>

- 설명: 레시피 수정 (이미지 보관 및 교체)
- Content-Type: `multipart/form-data`
- Form Data:
  - `keepUrls[]` (유지할 기존 이미지 URL)
  - `newImages[]` (새 이미지 파일 최대 10개)
  - 그 외 레시피 필드 및 `descriptionJSON`, `ingredientsJSON`
- Responses:
  - `200 OK` `{ "message": "레시피가 수정되었습니다." }`
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>GET /recipes/:id</code></summary>

- 설명: 레시피 상세 조회 (조회수 증가)
- Responses:
  - `200 OK`
    ```json
    {
      "recipe": {
        /* RECIPES */
      },
      "description": [
        /* DESCRIPTION */
      ],
      "ingredients": [
        /* INGREDIENTS */
      ]
    }
    ```
  - `404 Not Found` `{ "message": "레시피를 찾을 수 없습니다." }`
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>DELETE /recipes/:id</code></summary>

- 설명: 레시피 삭제 (이미지 파일 포함)
- Responses:
  - `200 OK` `{ "message": "레시피가 삭제되었습니다." }`
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>GET /recipes</code></summary>

- 설명: 레시피 검색 (제목, 반려동물, 분류)
- Query Parameters:
  - `title`, `pet`, `food` (선택)
- Responses:
  - `200 OK` `{ "recipes": [ /* 배열 */ ] }`
  - `500 Internal Server Error`
  </details>

<details>
<summary><code>GET /users/:userId/recipes</code></summary>

- 설명: 사용자별 레시피 목록 조회
- Responses:
  - `200 OK` `{ "recipes": [ { "id", "mainImageUrl", "title" }, ... ] }`
  - `404 Not Found` `{ "message": "레시피가 없습니다." }`
  - `500 Internal Server Error`
  </details>

---
