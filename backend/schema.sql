    CREATE TABLE cards (
        id SERIAL PRIMARY KEY,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        hint TEXT,
        tags TEXT[],
        "interval" INTEGER DEFAULT 0 NOT NULL,
        ease_factor REAL DEFAULT 2.5 NOT NULL,
        due_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE INDEX idx_cards_due_date ON cards(due_date);

    CREATE OR REPLACE FUNCTION trigger_set_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
    