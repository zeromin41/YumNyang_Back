# YumNyang_Back

먹었냥 프로젝트 백엔드

## API 명세서

- **Base URL**: `https://seungwoo.i234.me`
- **Content-Type**: `application/json`
- **쿠키 사용**: 인증 토큰은 `token` 쿠키에 `httpOnly` 설정으로 저장

---

<details>
<summary>회원 관리 (User)</summary>

### POST /signUp

- **Request Body**:
  ```json
  {
    "email": "user@example.com", // 필수
    "nickname": "nick", // 필수
    "password": "plain_password", // 필수
    "name": "뽀삐", // 선택 (반려동물 정보 입력 시 필수)
    "type": "고양이", // 선택 (반려동물 정보 입력 시 필수)
    "age": 3 // 선택
  }
  ```
- **Response**:
  - 200: `{ "message": "회원가입이 완료되었습니다." }`
  - 500: `{ "error": "회원가입에 실패했습니다." }`

### POST /withdraw

- **Request Body**:
  ```json
  {
    "id": "1", //필수
    "email": "user@example.com", //필수
    "password": "plain_password" //필수
  }
  ```
- **Response**:
  - 200: `{ "message": "회원탈퇴되었습니다." }`
  - 404: `{ "message": "패스워드가 올바르지않습니다." }`
  - 500: `{ "error": "회원탈퇴에 실패했습니다." }`

### POST /login

- **Request Body**:
  ```json
  {
    "email": "user@example.com", //필수
    "password": "plain_password" //필수
  }
  ```
- **Response**:
  - 200: `{ "message": "nick님 환영합니다.", "number": "1" }`
  - 401: `{ "message": "패스워드 5회 이상 실패했습니다." }`
  - 404: `{ "message": "아이디 또는 패스워드가 올바르지않습니다." }`
  - 500: `{ "error": "로그인 중 오류가 발생했습니다." }`

### GET /checkToken

- **Headers**: `Cookie: token=...`
- **Response**:
  - 200:
    ```json
    {
      "authenticated": true,
      "user": { "email": "user@example.com" }
    }
    ```
  - 401: `{ "message": "유효하지 않은 토큰입니다." }`
  - 500: `{ "error": "비정상적 접근입니다." }`

### POST /logout

- **Headers**: `Cookie: token=...`
- **Response**:
  - 200: `{ "message": "로그아웃되었습니다." }`
  - 500: `{ "error": "로그아웃에 실패했습니다." }`

### POST /passwordCheck

- **Request Body**:
  ```json
  {
    "id": "1", //필수
    "email": "user@example.com", //필수
    "password": "plain_password" //필수
  }
  ```
- **Response**:
  - 200: `{ "message": "비밀번호가 확인되었습니다." }`
  - 404: `{ "message": "패스워드가 올바르지않습니다." }`
  - 500: `{ "error": "서버에 오류가 발생했습니다." }`

### POST /changeUserInfo

- **Request Body**:
  ```json
  {
    // 단 선택 사항 중 하나 이상 값이 있을 때만 전송하는 것을 추천(선택에 없을경우 그냥해도 문제는 없으나 변경되는게 없다.)
    "id": 1, //필수
    "nickname": "newNick", // 선택
    "password": "new_password" // 선택
  }
  ```
- **Response**:
  - 200: `{ "message": "회원정보 변경이 완료되었습니다." }`
  - 500: `{ "error": "회원 정보 변경에 실패했습니다." }`

### GET /getUserNickname/:id

- **Response**:
  - 200: `{ "nickname": "nick" }`
  - 404: `{ "message": "유저가 존재하지않습니다." }`
  - 500: `{ "error": "유저 정보를 가져오는데 실패했습니다." }`

</details>

<details>
<summary>반려동물 정보 (Pet)</summary>

### POST /addPetInfo

- **Request Body**:
  ```json
  {
    "userId": 1, // 필수
    "name": "뽀삐", // 필수
    "type": "dog", //필수
    "age": 3 // 선택
  }
  ```
- **Response**:
  - 200: `{ "message": "펫 정보가 입력되었습니다." }`
  - 500: `{ "error": "반려동물 정보를 입력하는데 실패했습니다." }`

### POST /UpdatePetInfo

- **Request Body**:
  ```json
  {
    "id": 10, // 필수
    "userId": 1, //필수
    "name": "뽀삐", //필수
    "type": "dog", //필수
    "age": 4 // 선택
  }
  ```
- **Response**:
  - 200: `{ "message": "펫 정보가 변경되었습니다." }`
  - 500: `{ "error": "반려동물 정보를 변경하는데 실패했습니다." }`

### GET /getPetInfo/:userId

- **Response**:
  - 200: `{ "pets": [ /* 배열 */ ] }`
  - 404: `{ "message": "등록된 펫이 없습니다." }`
  - 500: `{ "error": "반려동물 정보를 가져오는데 실패했습니다." }`

### POST /removePetInfo/:id

- **Response**:
  - 200: `{ "message": "반려동물 정보를 삭제했습니다." }`
  - 500: `{ "error": "반려동물 정보를 삭제하는데 실패했습니다." }`

</details>

<details>
<summary>분류 & 원료 (Category & Ingredient)</summary>

### GET /getCategory

- **Response**:
  - 200: `{ "test": [ { "code": "402001", "codeNm": "농산물" }, ... ] }`
  - 500: `{ "message": "...", "details": ... }`

### POST /getIngredient

- **Request Body**:
  ```json
  { "upperListSel": "402003" } // 필수
  ```
- **Response**:
  - 200: `{ "test": [ /* 배열 */ ] }`
  - 500: `{ "message": "...", "details": ... }`

</details>

<details>
<summary>레시피 (Recipe)</summary>

### POST /AddRecipe

- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `images` (파일[], 최대 10장) // 선택
  - 기타 필드: `userId`, `title`, `description[]`, `targetPetType`, `foodCategory`, `cookingTimeLimit`, `level`, `caloriesPerServing`, `favoritesCount`, `carbs`, `protein`, `fat`, `calcium`, `phosphorus`, `moisture`, `fiber` // 필수
- **Image URL**: `https://seungwoo.i234.me/uploads/{filename}`
- **Response**:
  - 200: `{ "message": "레시피 추가가 완료되었습니다." }`
  - 500: `{ "error": "레시피 추가에 실패했습니다." }`

### POST /updateRecipe

- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `recipeId`, `keepUrls[]`, `newImages[]` // 선택
  - 기타 필드: `userId`, `title`, `descriptionChange[]`, `description[]`, `targetPetType`, `foodCategory`, `cookingTimeLimit`, `level`, `caloriesPerServing`, `favoritesCount`, `carbs`, `protein`, `fat`, `calcium`, `phosphorus`, `moisture`, `fiber`, `mainChange` // 필수
- **Image URL**: `https://seungwoo.i234.me/uploads/{filename}`
- **Response**:
  - 200: `{ "message": "레시피가 수정되었습니다." }`
  - 500: `{ "error": "레시피를 수정하는데 실패했습니다." }`

### GET /removeRecipe/:id

- **Response**:
  - 200: `{ "message": "레시피가 삭제되었습니다." }`
  - 500: `{ "error": "레시피 삭제에 실패했습니다." }`

### GET /getRecipe/:id

- **Response**:
  - 200: `{ "recipe": { /* RECIPES */ } }`
  - 404: `{ "message": "레시피가 존재하지않습니다." }`
  - 500: `{ "error": "레시피를 불러오는데 실패했습니다." }`

### POST /searchRecipe

- **Request Body**:
  ```json
  {
    "pet": "강아지", // 선택
    "food": "수산물", //선택
    "ingredient": "연어" //선택
  }
  ```
- **Response**:
  - 200: `{ "recipe": [ /* 배열 */ ] }`
  - 500: `{ "error": "레시피를 검색하는데 실패했습니다." }`

### GET /getMyRecipe/:userId

- **Response**:
  - 200: `{ "recipe": [ /* ID, MAIN_IMAGE_URL, TITLE */ ] }`
  - 404: `{ "message": "레시피가 없습니다." }`
  - 500: `{ "error": "나의 레시피를 찾는데 실패했습니다." }`

</details>

<details>
<summary>리뷰 (Review)</summary>

### POST /addReview

- **Request Body**:
  ```json
  { "recipeId": 1, "userId": 2, "ratingScore": 4, "commentText": "맛있어요!" } // 필수
  ```
- **Response**:
  - 200: `{ "message": "리뷰가 정상적으로 등록되었습니다." }`
  - 500: `{ "error": "리뷰 추가에 실패했습니다." }`

### GET /getReview/:recipeId

- **Response**:
  - 200: `{ "review": [ /* 배열 */ ] }`
  - 404: `{ "error": "리뷰가 없습니다." }`
  - 500: `{ "error": "리뷰 찾기를 실패했습니다" }`

### POST /upDateReview

- **Request Body**:
  ```json
  { "id": 5, "type": "update", "ratingScore": 3, "commentText": "괜찮아요" } // 필수
  ```
- **Response**:
  - 200: `{ "message": "업데이트 성공" }`
  - 200: `{ "message": "삭제 성공" }`
  - 500: `{ "error": "리뷰 처리에 실패했습니다." }`

### GET /getMyReview/:userId

- **Response**:
  - 200: `{ "reviews": [ /* 배열 */ ] }`
  - 404: `{ "message": "리뷰가 없습니다." }`
  - 500: `{ "error": "나의 리뷰를 가져오는데 실패했습니다." }`

</details>

<details>
<summary>즐겨찾기 (Favorites)</summary>

### POST /addFavorites

- **Request Body**:
  ```json
  { "userId": 2, "recipeId": 1 } //필수
  ```
- **Response**:
  - 200: `{ "message": "즐겨찾기 추가" }`
  - 500: `{ "error": "즐겨찾기 추가를 실패했습니다." }`

### GET /getFavorites/:userId

- **Response**:
  - 200: `{ "favorites": [ /* 배열 */ ] }`
  - 500: `{ "error": "즐겨찾기를 찾는데 실패했습니다." }`

### GET /removeFavorites/:id

- **Response**:
  - 200: `{ "message": "즐겨찾기 삭제" }`
  - 500: `{ "error": "즐겨찾기 삭제를 실패했습니다." }`

</details>

<details>
<summary>최근 본 레시피 (Recently Viewed)</summary>

### POST /addRecentlyView

- **Request Body**:
  ```json
  { "userId": 2, "recipeId": 1 } //필수
  ```
- **Response**:
  - 200: `{ "message": "최근 본 레시피 추가 완료" }`
  - 500: `{ "error": "서버에 문제가 발생했습니다." }`

### GET /getRecentlyView/:userId

- **Response**:
  - 200: `{ "recentlyView": [ /* 배열 */ ] }`
  - 500: `{ "error": "서버에 문제가 발생했습니다" }`

</details>

<details>
<summary>인기 레시피 (Popularity)</summary>

### GET /getPopularity

- **Response**:
  - 200: `{ "popularity": [ /* 배열 */ ] }`
  - 500: `{ "error": "서버에 문제가 발생했습니다." }`

</details>
