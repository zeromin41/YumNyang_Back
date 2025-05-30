CREATE TABLE USERS(
ID INT auto_increment PRIMARY KEY,
EMAIL VARCHAR(50) NOT NULL,
PASSWORD VARCHAR(255) NOT NULL,
NICKNAME VARCHAR(255) NOT NULL,
PROFILE_PICTURE_URL VARCHAR(255),
BIO VARCHAR(10),
CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
UPDATE_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE REVIEWS(
ID INT auto_increment PRIMARY KEY,
RECIPE_ID INT NOT NULL,
USER_ID INT NOT NULL,
RATING_SCORE INT NOT NULL,
COMMENT_TEXT LONGTEXT,
CREATED_AT TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
UPDATE_AT TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE PETS(
ID INT auto_increment PRIMARY KEY,
USER_ID INT,
NAME VARCHAR(255) NOT NULL,
TYPE VARCHAR(255) NOT NULL,
AGE INT,
CREATE_AT TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
UPDATE_AT TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP 
);

CREATE TABLE FAVORITES(
ID INT PRIMARY KEY,
USER_ID INT NOT NULL,
RECIPE_ID INT NOT NULL
);

# 컬럼에 대한 상세한 설명을 들을 필요성이 있다.
CREATE TABLE RECIPES(
ID INT auto_increment PRIMARY KEY,
USER_ID INT NULL,
TITLE VARCHAR(255) NOT NULL,
MAIN_IMAGE_URL VARCHAR(255),
DESCRIPTION LONGTEXT,
TARGET_PET_TYPE VARCHAR(255) NOT NULL,
FOOD_CATEGORY VARCHAR(255) NOT NULL,
COOKING_TIME_LIMIT INT,
LEVEL VARCHAR(255),
CALORIES_PER_SERVING FLOAT,
FAVORITES_COUNT INT,
NUTRITIONAL_INFO_CARBS_G FLOAT,
NUTRITIONAL_INFO_PROTEIN_G FLOAT,
NUTRITIONAL_INFO_FAT_G FLOAT,
NUTRITIONAL_INFO_CALCIUM_G FLOAT,
NUTRITIONAL_INFO_PHOSPHORUS_G FLOAT,
NUTRITIONAL_INFO_MOISTURE_PERCENT FLOAT,
NUTRITIONAL_INFO_FIBER_G FLOAT,
VIEW_COUNT INT DEFAULT 0,
CREATE_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
UPDATE_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE RECENTLY_VIEWED_RECIPES(
ID INT auto_increment PRIMARY KEY,
USER_ID INT NOT NULL,
RECIPE_ID INT NOT NULL
);

CREATE TABLE RECIPE_INGREDIENTS(
ID INT auto_increment PRIMARY KEY,
RECIPE_ID INT NOT NULL,
INGREDIENT_NAME VARCHAR(255) NOT NULL,
QUANTITY_AMOUNT FLOAT NOT NULL,
QUANTITY_UNIT VARCHAR(255) NOT NULL
);

CREATE TABLE TOKEN_USER(
EMAIL VARCHAR(255) PRIMARY KEY,
TOKEN VARCHAR(255),
CREATE_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE DESCRIPTION(
ID INT auto_increment PRIMARY KEY,
RECIPE_ID INT NOT NULL,
FLOW INT NOT NULL,
DESCRIPTION LONGTEXT,
IMAGE_URL VARCHAR(255)
);