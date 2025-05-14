# YumNyang_Back

먹었냥 프로젝트 백엔드

## 🔧 기본 정보

- **Base URL**: `https://seungwoo.i234.me`
- **Port**: `3333`
- **인증 방식**: JWT (쿠키 `token`, httpOnly)
- **Content-Type**
  - JSON 요청: `application/json`
  - 파일 업로드: `multipart/form-data`

---

## ⚙️ 인증 (Authentication)

<details>
<summary>POST /signUp</summary>

- **설명**: 신규 사용자 회원가입
- **Request Body** (`application/json`):
  ```json
  {
    "email": "user@example.com",
    "nickname": "nick",
    "password": "plain_password",
    "name": "뽀삐", // 선택(반려동물 등록 시 필요)
    "type": "dog", // 선택(반려동물 등록 시 필요)
    "age": 3 // 선택
  }
  ```
- **Response**:
  - `200 OK`
    ```json
    { "message": "회원가입이 완료되었습니다." }
    ```
  - `500 Internal Server Error`
    ```json
    { "error": "회원가입에 실패했습니다." }
    ```

</details>

<details>
<summary>POST /login</summary>

- **설명**: 로그인 (JWT 발급)
- **Request Body** (`application/json`):
  ```json
  {
    "email": "user@example.com",
    "password": "plain_password"
  }
  ```
- **Response**:
  - `200 OK`
    ```json
    { "message": "nick님 환영합니다.", "number": 1 }
    ```
    - 쿠키에 `token` 설정 (30분 유효, httpOnly)
  - `401 Unauthorized` (비밀번호 5회 이상 실패)
    ```json
    {
      "message": "패스워드 5회 이상 실패했습니다.\n비밀번호 변경 후 다시 시도해주세요."
    }
    ```
  - `404 Not Found` (아이디/비밀번호 불일치)
    ```json
    { "message": "아이디 또는 패스워드가 올바르지않습니다." }
    ```
  - `500 Internal Server Error`
    ```json
    { "error": "로그인 중 오류가 발생했습니다." }
    ```

</details>

<details>
<summary>GET /checkToken</summary>

- **설명**: 토큰 검증 및 갱신
- **Headers**: `Cookie: token=...`
- **Response**:
  - `200 OK`
    ```json
    {
      "authenticated": true,
      "user": { "email": "user@example.com" }
    }
    ```
    - 쿠키 `token` 재설정
  - `401 Unauthorized` (토큰 없음/만료)
    ```json
    { "message": "토큰이 없습니다." }
    ```
    또는
    ```json
    { "message": "유효하지 않은 토큰입니다." }
    ```
  - `500 Internal Server Error`
    ```json
    { "error": "비정상적 접근입니다." }
    ```

</details>

<details>
<summary>POST /logout</summary>

- **설명**: 로그아웃 (토큰 삭제)
- **Headers**: `Cookie: token=...`
- **Response**:
  - `200 OK`
    ```json
    { "message": "로그아웃되었습니다." }
    ```
  - `500 Internal Server Error`
    ```json
    { "error": "로그아웃에 실패했습니다." }
    ```

</details>

<details>
<summary>POST /checkId</summary>

- **설명**: 이메일(아이디) 중복 확인
- **Request Body** (`application/json`):
  ```json
  { "email": "user@example.com" }
  ```
- **Response**:
  - `200 OK` `{ "message": "사용가능한 아이디입니다." }`
  - `404 Not Found` `{ "message": "존재하는 아이디입니다." }`
  - `500 Internal Server Error` `{ "error": "서버에 문제가 발생했습니다." }`
  </details>

<details>
<summary>POST /withdraw</summary>

- **설명**: 회원 탈퇴
- **Request Body** (`application/json`):
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "password": "plain_password"
  }
  ```
- **Response**:
  - `200 OK` `{ "message": "회원탈퇴되었습니다." }`
  - `404 Bad Request` `{ "message": "올바르지못한 형식입니다." }`
  - `500 Internal Server Error` `{ "error": "회원탈퇴에 실패했습니다." }`
  </details>

<details>
<summary>POST /passwordCheck</summary>

- **설명**: 비밀번호 확인
- **Request Body** (`application/json`):
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "password": "plain_password"
  }
  ```
- **Response**:
  - `200 OK` `{ "message": "비밀번호가 확인되었습니다." }`
  - `404 Not Found` `{ "message": "패스워드가 올바르지않습니다." }`
  - `500 Internal Server Error` `{ "error": "서버에 오류가 발생했습니다." }`
  </details>

<details>
<summary>POST /changeUserInfo</summary>

- **설명**: 사용자 정보(닉네임/비밀번호) 변경
- **Request Body** (`application/json`):
  ```json
  {
    "id": 1,
    "nickname": "newNick", // 선택
    "password": "newPassword" // 선택
  }
  ```
- **Response**:
  - `200 OK` `{ "message": "회원정보 변경이 완료되었습니다." }`
  - `500 Internal Server Error` `{ "error": "회원 정보 변경에 실패했습니다." }`
  </details>

<details>
<summary>GET /getUserNickname/:id</summary>

- **설명**: 사용자 조회
- **Response**:
  - `200 OK` `{  "nickname": "userNickname" }`
  - `404 Not Found` `{ "message": "유저가 존재하지않습니다." }`
  - `500 Internal Server Error` `{ "error": "유저 정보를 가져오는데 실패했습니다." }`
  </details>

---

## 🐶 반려동물 (Pet)

<details>
<summary>POST /addPetInfo</summary>

- **설명**: 반려동물 정보 등록
- **Request Body** (`application/json`):
  ```json
  {
    "userId": 1,
    "name": "뽀삐",
    "type": "dog",
    "age": 3 // 선택
  }
  ```
- **Response**:
  - `200 OK` `{ "message": "펫 정보가 입력되었습니다." }`
  - `500 Internal Server Error` `{ "error": "반려동물 정보를 입력하는데 실패했습니다." }`

</details>

<details>
<summary>POST /UpdatePetInfo</summary>

- **설명**: 반려동물 정보 수정
- **Request Body**:
  ```json
  {
    "id": 10,
    "userId": 1,
    "name": "뽀삐",
    "type": "dog",
    "age": 4 //선택
  }
  ```
- **Response**:
  - `200 OK` `{ "message": "펫 정보가 변경되었습니다." }`
  - `500 Internal Server Error` `{ "error": "반려동물 정보를 변경하는데 실패했습니다." }`

</details>

<details>
<summary>GET /getPetInfo/:userId</summary>

- **설명**: 반려동물 정보 조회
- **Response**:
  - `200 OK` `{ "pets": [ /* 배열 */ ] }`
  - `404 Not Found` `{ "message": "등록된 펫이 없습니다." }`
  - `500 Internal Server Error` `{ "error": "반려동물 정보를 가져오는데 실패했습니다." }`

</details>

<details>
<summary>POST /removePetInfo/:id</summary>

- **설명**: 반려동물 정보 삭제
- **Response**:
  - `200 OK` `{ "message": "반려동물 정보를 삭제했습니다." }`
  - `500 Internal Server Error` `{ "error": "반려동물 정보를 삭제하는데 실패했습니다." }`

</details>

---

## 🍱 분류 & 원료 (Category & Ingredient)

<details>
<summary>GET /getCategory</summary>

- **설명**: 원료 대분류 코드 목록 (XML → JSON)
- **Response**:
  - `200 OK`
    ```json
    { "category": [ { "code": "402001", "codeNm": "농산물" }, ... ] }
    ```
  - `500 Internal Server Error`

</details>

<details>
<summary>POST /getIngredient</summary>

- **설명**: 원료 상세 목록 (XML → JSON)
- **Request Body**:
  ```json
  { "upperListSel": "402003" }
  ```
- **Response**:
  - `200 OK` `{ "ingredient": [ /* 배열 */ ] }`
  - `500 Internal Server Error`

</details>

---

## 🥘 레시피 (Recipe)

<details>
<summary>POST /AddRecipe</summary>

- **설명**: 레시피 추가
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `images`: 파일 최대 10개 // 선택
  - `userId`, `title`, `description[]`, `targetPetType`, `foodCategory`, `cookingTimeLimit`, `level`, `caloriesPerServing`, `favoritesCount`, `carbs`, `protein`, `fat`, `calcium`, `phosphorus`, `moisture`, `fiber`
  - `ingredientsName[]`, `ingredientsAmount[]`, `ingredientsUnit[]` // 선택
- **Response**:
  - `200 OK` `{ "message": "레시피 추가가 완료되었습니다." }`
  - `500 Internal Server Error`

</details>

<details>
<summary>POST /updateRecipe</summary>

- **설명**: 레시피 수정
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `recipeId`
  - `keepUrls`, `newImages` 파일 최대 10개(변경되지않은 이미지, 변경된 이미지) // 선택
  - `userId`, `title`, `description[]`, `descriptionChange[]`, `mainChange`, `targetPetType`, `foodCategory`, `cookingTimeLimit`, `level`, `caloriesPerServing`, `favoritesCount`, `carbs`, `protein`, `fat`, `calcium`, `phosphorus`, `moisture`, `fiber`
  - `ingredientsName`, `ingredientsAmount`, `ingredientsUnit` //선택
- **Response**:
  - `200 OK` `{ "message": "레시피가 수정되었습니다." }`
  - `500 Internal Server Error`

</details>

<details>
<summary>GET /getRecipe/:id</summary>

- **설명**: 레시피 조회 (조회수 증가)
- **Response**:
  - `200 OK` `{ "recipe": { /* RECIPES */ }, "description": [ /* DESCRIPTION */ ] }`
  - `404 Not Found` `{ "message": "레시피가 존재하지않습니다." }`
  - `500 Internal Server Error`

</details>

<details>
<summary>GET /removeRecipe/:id</summary>

- **설명**: 레시피 삭제 (이미지 파일 삭제 포함)
- **Response**:
  - `200 OK` `{ "message": "레시피가 삭제되었습니다." }`
  - `500 Internal Server Error`

</details>

<details>
<summary>POST /searchRecipe</summary>

- **설명**: 레시피 검색 (반려동물/분류/원료)
- **Request Body**:
  ```json
  { "pet": "dog", "food": "meat", "ingredient": "salmon" } // 선택
  ```
- **Response**:
  - `200 OK` `{ "recipe": [ /* 배열 */ ] }`
  - `500 Internal Server Error`

</details>

<details>
<summary>GET /getMyRecipe/:userId</summary>

- **설명**: 사용자별 레시피 목록
- **Response**:
  - `200 OK` `{ "recipe": [ { "ID", "MAIN_IMAGE_URL", "TITLE" }, ... ] }`
  - `404 Not Found` `{ "message": "레시피가 없습니다." }`
  - `500 Internal Server Error`

</details>

---

## 💬 리뷰 (Review)

<details>
<summary>POST /addReview</summary>

- **설명**: 리뷰 추가
- **Request Body**:
  ```json
  { "recipeId": 1, "userId": 2, "ratingScore": 4, "commentText": "맛있어요!" }
  ```
- **Response**:
  - `200 OK` `{ "message": "리뷰가 정상적으로 등록되었습니다." }`
  - `500 Internal Server Error`

</details>

<details>
<summary>GET /getReview/:recipeId</summary>

- **설명**: 레시피별 리뷰 조회
- **Response**:
  - `200 OK` `{ "review": [ /* 배열 */ ] }`
  - `404 Not Found` `{ "error": "리뷰가 없습니다." }`
  - `500 Internal Server Error`

</details>

<details>
<summary>POST /upDateReview</summary>

- **설명**: 리뷰 수정/삭제
- **Request Body**:
  ```json
  { "id": 5, "type": "update", "ratingScore": 3, "commentText": "괜찮아요" }
  ```
- **Response**:
  - `200 OK` `{ "message": "업데이트 성공" }` or `{ "message": "삭제 성공" }`
  - `500 Internal Server Error`

</details>

<details>
<summary>GET /getMyReview/:userId</summary>

- **설명**: 사용자별 리뷰 조회
- **Response**:
  - `200 OK` `{ "reviews": [ /* 배열 */ ] }`
  - `404 Not Found` `{ "message": "리뷰가 없습니다." }`
  - `500 Internal Server Error`

</details>

---

## ⭐ 즐겨찾기 & 최근 본 & 인기

<details>
<summary>POST /addFavorites</summary>

- **설명**: 즐겨찾기 추가
- **Request Body**:
  ```json
  { "userId": 2, "recipeId": 1 }
  ```
- **Response**:
  - `200 OK` `{ "message": "즐겨찾기 추가" }`
  - `500 Internal Server Error`

</details>

<details>
<summary>GET /getFavorites/:userId</summary>

- **설명**: 즐겨찾기 조회
- **Response**:
  - `200 OK` `{ "favorites": [ /* 배열 */ ] }`
  - `500 Internal Server Error`

</details>

<details>
<summary>GET /removeFavorites/:id</summary>

- **설명**: 즐겨찾기 삭제
- **Response**:
  - `200 OK` `{ "message": "즐겨찾기 삭제" }`
  - `500 Internal Server Error`

</details>

<details>
<summary>POST /addRecentlyView</summary>

- **설명**: 최근 본 레시피 추가
- **Request Body**:
  ```json
  { "userId": 2, "recipeId": 1 }
  ```
- **Response**:
  - `200 OK` `{ "message": "최근 본 레시피 추가 완료" }`
  - `500 Internal Server Error`

</details>

<details>
<summary>GET /getRecentlyView/:userId</summary>

- **설명**: 최근 본 레시피 조회
- **Response**:
  - `200 OK` `{ "recentlyView": [ /* 배열 */ ] }`
  - `500 Internal Server Error`

</details>

<details>
<summary>GET /getPopularity</summary>

- **설명**: 상위 5개 인기 레시피
- **Response**:
  - `200 OK` `{ "popularity": [ /* 배열 */ ] }`
  - `500 Internal Server Error`

</details>
