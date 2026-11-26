CREATE TABLE dish_categories (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE dishes
    ADD COLUMN category_id INT NULL,
    ADD CONSTRAINT fk_dishes_category
        FOREIGN KEY (category_id) REFERENCES dish_categories(id);
