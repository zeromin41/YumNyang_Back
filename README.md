# YumNyang_Back

먹었냥 프로젝트 백엔드

## API 명세서

- **Base URL**: `https://seungwoo.i234.me:3333`
- **Content-Type**: `application/json`
- **쿠키 사용**: 인증 토큰은 `token` 쿠키에 `httpOnly` 설정으로 저장

---

<details>
<summary>회원 관리 (User)</summary>

### 회원가입 - `POST /signUp`

- **Request Body**:
  ```json
  {
    "email": "user@example.com", // 필수
    "nickname": "nick", // 필수
    "password": "plain_password", // 필수
    "name": "뽀삐", // 선택사항 단, 반려동물 기입 시 필수
    "type": "고양이", // 선택사항 단, 반려동물 기입 시 필수
    "age": 3 // 선택사항 / 반려동물 기입 시에도 선택사항
  }
  ```
- **Response**:
  - **200 OK**: `{ "message": "회원가입이 완료되었습니다." }`
  - **500**: `{ "error": "회원가입에 실패했습니다." }`

### 회원 탈퇴 - `POST /withdraw`

- **Request Body**:
  ```json
  {
    "email": "user@example.com", //필수
    "password": "plain_password" //필수
  }
  ```
- **Response**:
  - **200 OK**: `{ "message": "회원탈퇴되었습니다." }`
  - **404**: `{ "message": "패스워드가 올바르지않습니다." }`
  - **500**: `{ "error": "회원탈퇴에 실패했습니다." }`

### 로그인 - `POST /login`

- **Request Body**:
  ```json
  {
    "email": "user@example.com", // 필수
    "password": "plain_password" // 필수
  }
  ```
- **Response**:
  - **200 OK**: `{ "message": "user님 환영합니다.", "id": "1" }`
  - **401**: `{ "message": "패스워드 5회 이상 실패했습니다." }`
  - **404**: `{ "message": "아이디 또는 패스워드가 올바르지않습니다." }`
  - **500**: `{ "error": "로그인 중 오류가 발생했습니다." }`

### 토큰 확인/갱신 - `GET /checkToken`

- **Headers**: `Cookie: token=...`
- **Response**:
  - **200 OK**:
    ```json
    {
      "authenticated": true, // 필수
      "user": { "email": "user@example.com" } // 필수
    }
    ```
  - **401**: `{ "message": "유효하지 않은 토큰입니다." }`
  - **500**: `{ "error": "비정상적 접근입니다." }`

### 로그아웃 - `POST /logout`

- **Headers**: `Cookie: token=...`
- **Response**:
  - **200 OK**: `{ "message": "로그아웃되었습니다." }`
  - **500**: `{ "error": "로그아웃에 실패했습니다." }`
  </details>

<details>
<summary>반려동물 정보 (Pet)</summary>

### 반려동물 정보 추가 - `POST /addPetInfo`

- **Request Body**:
  ```json
  {
    "userId": 1, // 필수
    "name": "뽀삐", //필수
    "type": "dog", //필수
    "age": 3 // 선택
  }
  ```
- **Response**:
  - **200 OK**: `{ "message": "펫 정보가 입력되었습니다." }`
  - **500**: `{ "error": "반려동물 정보를 입력하는데 실패했습니다." }`

### 반려동물 정보 업데이트 - `POST /UpdatePetInfo`

- **Request Body**:
  ```json
  {
    "id": 10, // 필수
    "userId": 1, // 필수
    "name": "뽀삐", //필수
    "type": "dog", //필수
    "age": 4 // 필수
  }
  ```
- **Response**:
  - **200 OK**: `{ "message": "펫 정보가 변경되었습니다." }`
  - **500**: `{ "error": "반려동물 정보를 변경하는데 실패했습니다." }`

### 반려동물 정보 조회 - `GET /getPetInfo/:userId`

- **Parameters**: `userId`
- **Response**:
  - **200 OK**: `{ "pets": [ /* pet 정보 배열 */ ] }`
  - **404**: `{ "message": "등록된 펫이 없습니다." }`
  - **500**: `{ "error": "반려동물 정보를 가져오는데 실패했습니다." }`

### 반려동물 정보 삭제 - `POST /removePetInfo/:id`

- **Parameters**: `id`
- **Response**:
  - **200 OK**: `{ "message": "반려동물 정보를 삭제했습니다." }`
  - **500**: `{ "error": "반려동물 정보를 삭제하는데 실패했습니다." }`
  </details>

<details>
<summary>분류 & 원료 (Category & Ingredient)</summary>

### 분류 코드 조회 - `GET /getCategory`

- **Response**:
  - **200 OK**: `{ "test": [ { "code": "402001", "codeNm": "농산물" }, ... ] }`
  - **500**: `{ "message": "...", "details": ... }`

### 원료 목록 조회 - `POST /getIngredient`

- **Request Body**:
  ```json
  { "upperListSel": "402003" } // 필수
  ```
- **Response**:
  - **200 OK**: `{ "test": [ /* 원료 배열 */ ] }`
  - **500**: `{ "message": "...", "details": ... }`
  </details>

<details>
<summary>레시피 (Recipe)</summary>

### 레시피 추가 - `POST /AddRecipe`

- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `images` (파일[], 최대 10장) // 선택사항
  - `userId`, `title`, `description[]`, `targetPetType`, `foodCategory`, `cookingTimeLimit`, `level`, `caloriesPerServing`, `favoritesCount`, `carbs`, `protein`, `fat`, `calcium`, `phosphorus`, `moisture`, `fiber` // 필수
- **Image URL**: `https://seungwoo.i234.me/uploads/{filename}`
- **Response**:
  - **200 OK**: `{ "message": "레시피 추가가 완료되었습니다." }`
  - **500**: `{ "error": "레시피 추가에 실패했습니다." }`

### 레시피 수정 - `POST /updateRecipe`

- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `recipeId`, `keepUrls[]`, `newImages[]` // 선택
  - 기타 필드: `userId`, `title`, `descriptionChange[]`, `description[]`, `targetPetType`, `foodCategory`, `cookingTimeLimit`, `level`, `caloriesPerServing`, `favoritesCount`, `carbs`, `protein`, `fat`, `calcium`, `phosphorus`, `moisture`, `fiber`, `mainChange` // 필수
- **Image URL**: `https://seungwoo.i234.me/uploads/{filename}`
- **Response**:
  - **200 OK**: `{ "message": "레시피가 수정되었습니다." }`
  - **500**: `{ "error": "레시피를 수정하는데 실패했습니다." }`

### 레시피 삭제 - `GET /removeRecipe/:id`

- **Parameters**: `id`
- **Response**:
  - **200 OK**: `{ "message": "레시피가 삭제되었습니다." }`
  - **500**: `{ "error": "레시피 삭제에 실패했습니다." }`

### 레시피 조회 - `GET /getRecipe/:id`

- **Parameters**: `id`
- **Response**:
  - **200 OK**: `{ "recipe": { /* RECIPES 컬럼 */ } }`
  - **404**: `{ "message": "레시피가 존재하지않습니다." }`
  - **500**: `{ "error": "레시피를 불러오는데 실패했습니다." }`

### 레시피 검색 - `POST /searchRecipe`

- **Request Body**:
  ```json
  {
    "pet": "강아지", // 선택
    "food": "수산물", // 선택
    "ingredient": "연어" // 선택
  }
  ```
- **Response**:
  - **200 OK**: `{ "recipe": [ /* 레시피 배열 */ ] }`
  - **500**: `{ "error": "레시피를 검색하는데 실패했습니다." }`

### 내 레시피 조회 - `GET /getMyRecipe/:userId`

- **Parameters**: `userId`
- **Response**:
  - **200 OK**: `{ "recipe": [ /* ID, MAIN_IMAGE_URL, TITLE */ ] }`
  - **404**: `{ "message": "레시피가 없습니다." }`
  - **500**: `{ "error": "나의 레시피를 찾는데 실패했습니다." }`
  </details>

<details>
<summary>리뷰 (Review)</summary>

### 리뷰 추가 - `POST /addReview`

- **Request Body**:
  ```json
  {
    "recipeId": 1, //필수
    "userId": 2, //필수
    "ratingScore": 4, //필수
    "commentText": "맛있어요!" //필수
  }
  ```
- **Response**:
  - **200 OK**: `{ "message": "리뷰가 정상적으로 등록되었습니다." }`
  - **500**: `{ "error": "리뷰 추가에 실패했습니다." }`

### 리뷰 조회 - `GET /getReview/:recipeId`

- **Parameters**: `recipeId`
- **Response**:
  - **200 OK**: `{ "review": [ /* 리뷰 배열 */ ] }`
  - **404**: `{ "error": "리뷰가 없습니다." }`
  - **500**: `{ "error": "리뷰 찾기를 실패했습니다" }`

### 내 리뷰 조회 - `GET /getMyReview/:userId`

- **Parameters**: `userId`
- **Response**:
  - **200 OK**: `{ "reviews": [ /* 리뷰 배열 */ ] }`
  - **404**: `{ "message": "리뷰가 없습니다." }`
  - **500**: `{ "error": "나의 리뷰를 가져오는데 실패했습니다." }`

### 리뷰 수정/삭제 - `POST /upDateReview`

- **Request Body**:
  ```json
  {
    "id": 5, //필수
    "type": "update", //필수
    "ratingScore": 3, //필수
    "commentText": "괜찮아요" // 필수
  }
  ```
- **Response**:
  - **200 OK**: `{ "message": "업데이트 성공" }` or `{ "message": "삭제 성공" }`
  - **500**: `{ "error": "... 실패했습니다." }`
  </details>

<details>
<summary>즐겨찾기 (Favorites)</summary>

### 즐겨찾기 추가 - `POST /addFavorites`

- **Request Body**:
  ```json
  {
    "userId": 2, //필수
    "recipeId": 1 //필수
  }
  ```
- **Response**:
  - **200 OK**: `{ "message": "즐겨찾기 추가" }`
  - **500**: `{ "error": "즐겨찾기 추가를 실패했습니다." }`

### 즐겨찾기 조회 - `GET /getFavorites/:userId`

- **Parameters**: `userId`
- **Response**:
  - **200 OK**: `{ "favorites": [ /* 즐겨찾기 배열 */ ] }`
  - **500**: `{ "error": "즐겨찾기를 찾는데 실패했습니다." }`

### 즐겨찾기 삭제 - `GET /removeFavorites/:id`

- **Parameters**: `id`
- **Response**:
  - **200 OK**: `{ "message": "즐겨찾기 삭제" }`
  - **500**: `{ "error": "즐겨찾기 삭제를 실패했습니다." }`
  </details>

<details>
<summary>최근 본 레시피 (Recently Viewed)</summary>

### 추가 - `POST /addRecentlyView`

- **Request Body**:
  ```json
  {
    "userId": 2, //필수
    "recipeId": 1 //필수
  }
  ```
- **Response**:
  - **200 OK**: `{ "message": "최근 본 레시피 추가 완료" }`
  - **500**: `{ "error": "서버에 문제가 발생했습니다." }`

### 조회 - `GET /getRecentlyView/:userId`

- **Parameters**: `userId`
- **Response**:
  - **200 OK**: `{ "recentlyView": [ /* 조회 배열 */ ] }`
  - **500**: `{ "error": "서버에 문제가 발생했습니다" }`
  </details>

<details>
<summary>인기 레시피 (Popularity)</summary>

### 조회 - `GET /getPopularity`

- **Response**:
  - **200 OK**: `{ "popularity": [ /* 인기 5개 레시피 배열 */ ] }`
  - **500**: `{ "error": "서버에 문제가 발생했습니다." }`
  </details>
