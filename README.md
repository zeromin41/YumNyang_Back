# YumNyang_Back

먹었냥 프로젝트 백엔드

## API 명세서

- **Base URL**: `https://seungwoo.i234.me:3333`
- **Content-Type**: `application/json`
- **쿠키 사용**: 인증 토큰은 `token` 쿠키에 `httpOnly` 설정으로 저장

---

<details>
<summary>인증(Authentication)</summary>

### 로그인

- **URL**: `/login`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "plain_password"
  }
  ```
- **Response**:
  - **200 OK**
    ```json
    { "message": "user@example.com님 환영합니다." }
    ```
  - **401 / 404 / 500**: 오류 메시지

### 로그아웃

- **URL**: `/logout`
- **Method**: `POST`
- **Headers**:
  - `Cookie: token=...`
- **Response**:
  - **200 OK**
    ```json
    { "message": "로그아웃되었습니다." }
    ```
  - **401 / 500**: 오류 메시지

### 토큰 갱신 및 확인

- **URL**: `/checkToken`
- **Method**: `GET`
- **Headers**:
  - `Cookie: token=...`
- **Response**:
  - **200 OK**
    ```json
    {
      "authenticated": true,
      "user": { "email": "user@example.com" }
    }
    ```
  - **401 / 500**: 오류 메시지

</details>

<details>
<summary>사용자(User)</summary>

### 회원가입

- **URL**: `/signUp`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "nickname": "nick",
    "password": "plain_password"
  }
  ```
- **Response**:
  - **200 OK**
    ```json
    { "message": "회원가입이 완료되었습니다." }
    ```
  - **500**: 오류 메시지

### 회원 탈퇴

- **URL**: `/withdraw`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "plain_password"
  }
  ```
- **Response**:
  - **200 OK**
    ```json
    { "message": "회원탈퇴되었습니다." }
    ```
  - **404 / 500**: 오류 메시지

</details>

<details>
<summary>레시피(Recipe)</summary>

### 레시피 추가

- **URL**: `/AddRecipe`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `images` (파일, 다중, 최대 10장)
  - 기타 필드 (`userId`, `title`, `description`, `targetPetType`, `foodCategory`, `cookingTimeLimit`, `level`, `caloriesPerServing`, `favoritesCount`, `carbs`, `protein`, `fat`, `calcium`, `phosphorus`, `moisture`, `fiber`)
- **Response**:
  - **200 OK**
    ```json
    { "message": "레시피 추가가 완료되었습니다." }
    ```
  - **500**: 오류 메시지

### 레시피 수정

- **URL**: `/updateRecipe`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `recipeId` (숫자)
  - `keepUrls` (JSON 배열 문자열)
  - `newImages` (파일, 다중, 최대 10장)
  - 기타 필드 (`userId`, `title`, `description`, `targetPetType`, `foodCategory`, `cookingTimeLimit`, `level`, `caloriesPerServing`, `favoritesCount`, `carbs`, `protein`, `fat`, `calcium`, `phosphorus`, `moisture`, `fiber`, `mainChange`, `descriptionChange`)
- **Response**:
  - **200 OK**
    ```json
    { "message": "레시피가 수정되었습니다." }
    ```
  - **500**: 오류 메시지

### 레시피 삭제

- **URL**: `/removeRecipe/:id`
- **Method**: `GET`
- **Parameters**:
  - `id` (레시피 ID)
- **Response**:
  - **200 OK**
    ```json
    { "message": "레시피가 삭제되었습니다." }
    ```
  - **500**: 오류 메시지

### 레시피 조회

- **URL**: `/getRecipe/:id`
- **Method**: `GET`
- **Parameters**:
  - `id` (레시피 ID)
- **Response**:
  - **200 OK**
    ```json
    {
      "recipe": {
        /* RECIPES 테이블 컬럼 */
      }
    }
    ```
  - **404**: 레시피 없음
  - **500**: 오류 메시지

### 레시피 검색

- **URL**: `/searchRecipe`
- **Method**: `POST`
- **Request Body** (옵션 필드):
  ```json
  {
    "pet": "강아지",
    "food": "수산물",
    "ingredient": "연어"
  }
  ```
- **Response**:
  - **200 OK**
    ```json
    {
      "recipe": [
        /* 레시피 배열 */
      ]
    }
    ```
  - **500**: 오류 메시지

</details>

<details>
<summary>분류 & 원료</summary>

### 카테고리 목록 조회

- **URL**: `/getCategory`
- **Method**: `GET`
- **Response**:
  - **200 OK**
    ```json
    {
      "test": [
        { "code": "402001", "codeNm": "농산물" },
        ...
      ]
    }
    ```
  - **500**: 오류 메시지

### 원료 목록 조회

- **URL**: `/getIngredient`
- **Method**: `POST`
- **Request Body**:
  ```json
  { "upperListSel": "402003" }
  ```
- **Response**:
  - **200 OK**
    ```json
    {
      "test": [
        /* 원료 배열 */
      ]
    }
    ```
  - **500**: 오류 메시지

</details>

<details>
<summary>리뷰(Review)</summary>

### 리뷰 추가

- **URL**: `/addReview`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "recipeId": 1,
    "userId": 2,
    "ratingScore": 4,
    "commentText": "맛있어요!"
  }
  ```
- **Response**:
  - **200 OK**
    ```json
    { "message": "리뷰가 정상적으로 등록되었습니다." }
    ```
  - **500**: 오류 메시지

### 리뷰 조회

- **URL**: `/getReview/:recipeId`
- **Method**: `GET`
- **Parameters**:
  - `recipeId`
- **Response**:
  - **200 OK**
    ```json
    {
      "review": [
        /* 리뷰 배열 */
      ]
    }
    ```
  - **404**: 리뷰 없음
  - **500**: 오류 메시지

### 리뷰 수정/삭제

- **URL**: `/upDateReview`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "id": 5,
    "type": "update",
    "ratingScore": 3,
    "commentText": "괜찮아요"
  }
  ```
- **Response**:
  - **200 OK**
    ```json
    { "message": "업데이트 성공" }
    ```
  - **500**: 오류 메시지

</details>

<details>
<summary>즐겨찾기(Favorites)</summary>

### 즐겨찾기 추가

- **URL**: `/addFavorites`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "userId": 2,
    "recipeId": 1
  }
  ```
- **Response**:
  - **200 OK**
    ```json
    { "message": "즐겨찾기 추가" }
    ```
  - **500**: 오류 메시지

### 즐겨찾기 조회

- **URL**: `/getFavorites/:userId`
- **Method**: `GET`
- **Parameters**:
  - `userId`
- **Response**:
  - **200 OK**
    ```json
    {
      "favorites": [
        /* 즐겨찾기 배열 */
      ]
    }
    ```
  - **500**: 오류 메시지

### 즐겨찾기 삭제

- **URL**: `/removeFavorites/:id`
- **Method**: `GET`
- **Parameters**:
  - `id` (즐겨찾기 레코드 ID)
- **Response**:
  - **200 OK**
    ```json
    { "message": "즐겨찾기 삭제" }
    ```
  - **500**: 오류 메시지

</details>

<details>
<summary>최근 본 레시피(Recently Viewed)</summary>

### 추가

- **URL**: `/addRecentlyView`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "userId": 2,
    "recipeId": 1
  }
  ```
- **Response**:
  - **200 OK**
    ```json
    { "message": "최근 본 레시피 추가 완료" }
    ```
  - **500**: 오류 메시지

### 조회

- **URL**: `/getRecentlyView/:userId`
- **Method**: `GET`
- **Parameters**:
  - `userId`
- **Response**:
  - **200 OK**
    ```json
    {
      "recentlyView": [
        /* 조회 배열 */
      ]
    }
    ```
  - **500**: 오류 메시지

</details>

<details>
<summary>인기 레시피(Popularity)</summary>

- **URL**: `/getPopularity`
- **Method**: `GET`
- **Response**:
  - **200 OK**
    ```json
    {
      "popularity": [
        /* 상위 5개 레시피 */
      ]
    }
    ```
  - **500**: 오류 메시지

</details>

<details>
<summary>정적 파일 업로드</summary>

- **업로드 경로**: `/uploads/{filename}`
- **서버 시작**: HTTPS (`https://seungwoo.i234.me/uploads/{filename}`)

> **Note:** 각 엔드포인트의 응답 예시는 성공 케이스를 중심으로 기재하였으며, 모든 에러 케이스는 상태 코드에 맞는 JSON 형태의 `error` 또는 `message` 필드를 반환합니다.

</details>
