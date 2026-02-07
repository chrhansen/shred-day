SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: gen_id(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.gen_id(prefix text DEFAULT NULL::text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    return_string    TEXT;
    no_of_chars      INT := 12;
    -- Max. 16 chars. If more, then increase DECIMAL-size in hex_to_base58
BEGIN
    -- Entropy bytes
    return_string := RIGHT(gen_random_bytes(no_of_chars)::text, - 2);
    -- Note: We truncate the output to no_of_chars, further down. So the
    -- final entropy will be less. E.g. 12 Base58-chars is only about 9
    -- bytes of entropy.

    return_string := hex_to_base58(return_string);

    return_string := substring(return_string from 1 for no_of_chars);

    IF prefix IS NOT NULL THEN
        return_string := prefix || '_' || return_string;
    END IF;

    RETURN return_string;
END;
$$;


--
-- Name: FUNCTION gen_id(prefix text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.gen_id(prefix text) IS 'Generates a Base58-encoded ID
 with 80 random bits';


--
-- Name: hex_to_base58(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hex_to_base58(hexstr text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
    bytes          BYTEA := ('\x' || hexstr)::BYTEA;
    leading_zeroes INT := 0;
    num            DECIMAL(40,0) := 0;
    base           DECIMAL(40,0) := 1;

    -- Bitcoin base58 alphabet
    base58_alphabet TEXT := '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    byte_value      INT;
    byte_val        INT;
    byte_values     INT[] DEFAULT ARRAY[]::INT[];
    modulo          INT;
    base58_result   TEXT := '';
BEGIN
    FOR hex_index IN REVERSE ((length(hexstr) / 2) - 1)..0 LOOP
        byte_value := get_byte(bytes, hex_index);
        IF byte_value = 0 THEN
            leading_zeroes := leading_zeroes + 1;
        ELSE
            leading_zeroes := 0;
            num := num + (base * byte_value);
        END IF;
        base := base * 256; -- = 16^2 (2 hex-digits)
    END LOOP;

    WHILE num > 0 LOOP
        modulo := num % length(base58_alphabet);
        num := div(num, length(base58_alphabet));
        byte_values := array_append(byte_values, modulo);
    END LOOP;

    FOREACH byte_val IN ARRAY byte_values
    LOOP
        base58_result := SUBSTRING(base58_alphabet, byte_val + 1, 1) || base58_result;
    END LOOP;

    base58_result := repeat(SUBSTRING(base58_alphabet, 1, 1), leading_zeroes) || base58_result;

    RETURN base58_result;
END;
$$;


--
-- Name: FUNCTION hex_to_base58(hexstr text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.hex_to_base58(hexstr text) IS 'Encodes a hex-string to
Base58 using the bitcoin alphabet';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: active_storage_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.active_storage_attachments (
    id bigint NOT NULL,
    name character varying NOT NULL,
    record_type character varying NOT NULL,
    record_id character varying NOT NULL,
    blob_id bigint NOT NULL,
    created_at timestamp(6) without time zone NOT NULL
);


--
-- Name: active_storage_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.active_storage_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: active_storage_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.active_storage_attachments_id_seq OWNED BY public.active_storage_attachments.id;


--
-- Name: active_storage_blobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.active_storage_blobs (
    id bigint NOT NULL,
    key character varying NOT NULL,
    filename character varying NOT NULL,
    content_type character varying,
    metadata text,
    service_name character varying NOT NULL,
    byte_size bigint NOT NULL,
    checksum character varying,
    created_at timestamp(6) without time zone NOT NULL
);


--
-- Name: active_storage_blobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.active_storage_blobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: active_storage_blobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.active_storage_blobs_id_seq OWNED BY public.active_storage_blobs.id;


--
-- Name: active_storage_variant_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.active_storage_variant_records (
    id bigint NOT NULL,
    blob_id bigint NOT NULL,
    variation_digest character varying NOT NULL
);


--
-- Name: active_storage_variant_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.active_storage_variant_records_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: active_storage_variant_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.active_storage_variant_records_id_seq OWNED BY public.active_storage_variant_records.id;


--
-- Name: ar_internal_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ar_internal_metadata (
    key character varying NOT NULL,
    value character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: days; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.days (
    id character varying DEFAULT public.gen_id('day'::text) NOT NULL,
    date date,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    user_id character varying NOT NULL,
    resort_id character varying NOT NULL,
    notes text,
    day_number integer,
    shared_at timestamp(6) without time zone,
    CONSTRAINT days_notes_max_500_chars CHECK (((notes IS NULL) OR (char_length(notes) <= 500)))
);


--
-- Name: days_skis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.days_skis (
    day_id character varying NOT NULL,
    ski_id character varying NOT NULL
);


--
-- Name: draft_days; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.draft_days (
    id character varying DEFAULT public.gen_id('drd'::text) NOT NULL,
    photo_import_id character varying,
    resort_id character varying NOT NULL,
    day_id character varying,
    date date NOT NULL,
    decision integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    text_import_id character varying,
    original_text text,
    CONSTRAINT single_import_type CHECK ((((photo_import_id IS NOT NULL) AND (text_import_id IS NULL)) OR ((photo_import_id IS NULL) AND (text_import_id IS NOT NULL))))
);


--
-- Name: google_sheet_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_sheet_integrations (
    id character varying DEFAULT public.gen_id('gsi'::text) NOT NULL,
    user_id character varying NOT NULL,
    spreadsheet_id character varying,
    spreadsheet_url character varying,
    access_token text,
    refresh_token text,
    access_token_expires_at timestamp(6) without time zone,
    status integer DEFAULT 0 NOT NULL,
    last_synced_at timestamp(6) without time zone,
    last_error text,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: photo_imports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.photo_imports (
    id character varying DEFAULT public.gen_id('pi'::text) NOT NULL,
    user_id character varying NOT NULL,
    status integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.photos (
    id character varying DEFAULT public.gen_id('ph'::text) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    day_id character varying,
    user_id character varying NOT NULL,
    draft_day_id character varying,
    photo_import_id character varying,
    resort_id character varying,
    latitude double precision,
    longitude double precision,
    taken_at timestamp(6) without time zone,
    exif_state integer DEFAULT 0 NOT NULL
);


--
-- Name: resorts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resorts (
    id character varying DEFAULT public.gen_id('re'::text) NOT NULL,
    name character varying,
    latitude double precision,
    longitude double precision,
    country character varying,
    region character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    normalized_name text,
    suggested_at timestamp(6) without time zone,
    suggested_by character varying,
    verified boolean DEFAULT true NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: season_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.season_goals (
    id character varying DEFAULT public.gen_id('sgo'::text) NOT NULL,
    user_id character varying NOT NULL,
    season_start_year integer NOT NULL,
    goal_days integer NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: skis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skis (
    id character varying DEFAULT public.gen_id('ski'::text) NOT NULL,
    name character varying,
    user_id character varying NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: tag_days; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tag_days (
    id character varying DEFAULT public.gen_id('tgdy'::text) NOT NULL,
    day_id character varying NOT NULL,
    tag_id character varying NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id character varying DEFAULT public.gen_id('tag'::text) NOT NULL,
    user_id character varying NOT NULL,
    name character varying NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: text_imports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.text_imports (
    id character varying DEFAULT public.gen_id('ti'::text) NOT NULL,
    user_id character varying NOT NULL,
    status integer DEFAULT 0 NOT NULL,
    original_text text,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT public.gen_id('user'::text) NOT NULL,
    email character varying,
    password_digest character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    season_start_day character varying DEFAULT '09-01'::character varying NOT NULL,
    full_name character varying,
    username character varying
);


--
-- Name: active_storage_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_attachments ALTER COLUMN id SET DEFAULT nextval('public.active_storage_attachments_id_seq'::regclass);


--
-- Name: active_storage_blobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_blobs ALTER COLUMN id SET DEFAULT nextval('public.active_storage_blobs_id_seq'::regclass);


--
-- Name: active_storage_variant_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_variant_records ALTER COLUMN id SET DEFAULT nextval('public.active_storage_variant_records_id_seq'::regclass);


--
-- Name: active_storage_attachments active_storage_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_attachments
    ADD CONSTRAINT active_storage_attachments_pkey PRIMARY KEY (id);


--
-- Name: active_storage_blobs active_storage_blobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_blobs
    ADD CONSTRAINT active_storage_blobs_pkey PRIMARY KEY (id);


--
-- Name: active_storage_variant_records active_storage_variant_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_variant_records
    ADD CONSTRAINT active_storage_variant_records_pkey PRIMARY KEY (id);


--
-- Name: ar_internal_metadata ar_internal_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_internal_metadata
    ADD CONSTRAINT ar_internal_metadata_pkey PRIMARY KEY (key);


--
-- Name: days days_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.days
    ADD CONSTRAINT days_pkey PRIMARY KEY (id);


--
-- Name: draft_days draft_days_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_days
    ADD CONSTRAINT draft_days_pkey PRIMARY KEY (id);


--
-- Name: google_sheet_integrations google_sheet_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_sheet_integrations
    ADD CONSTRAINT google_sheet_integrations_pkey PRIMARY KEY (id);


--
-- Name: photo_imports photo_imports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photo_imports
    ADD CONSTRAINT photo_imports_pkey PRIMARY KEY (id);


--
-- Name: photos photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_pkey PRIMARY KEY (id);


--
-- Name: resorts resorts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resorts
    ADD CONSTRAINT resorts_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: season_goals season_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_goals
    ADD CONSTRAINT season_goals_pkey PRIMARY KEY (id);


--
-- Name: skis skis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skis
    ADD CONSTRAINT skis_pkey PRIMARY KEY (id);


--
-- Name: tag_days tag_days_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_days
    ADD CONSTRAINT tag_days_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: text_imports text_imports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.text_imports
    ADD CONSTRAINT text_imports_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: index_active_storage_attachments_on_blob_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_active_storage_attachments_on_blob_id ON public.active_storage_attachments USING btree (blob_id);


--
-- Name: index_active_storage_attachments_uniqueness; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_active_storage_attachments_uniqueness ON public.active_storage_attachments USING btree (record_type, record_id, name, blob_id);


--
-- Name: index_active_storage_blobs_on_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_active_storage_blobs_on_key ON public.active_storage_blobs USING btree (key);


--
-- Name: index_active_storage_variant_records_uniqueness; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_active_storage_variant_records_uniqueness ON public.active_storage_variant_records USING btree (blob_id, variation_digest);


--
-- Name: index_days_on_resort_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_days_on_resort_id ON public.days USING btree (resort_id);


--
-- Name: index_days_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_days_on_user_id ON public.days USING btree (user_id);


--
-- Name: index_days_skis_on_day_id_and_ski_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_days_skis_on_day_id_and_ski_id ON public.days_skis USING btree (day_id, ski_id);


--
-- Name: index_days_skis_on_ski_id_and_day_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_days_skis_on_ski_id_and_day_id ON public.days_skis USING btree (ski_id, day_id);


--
-- Name: index_draft_days_on_day_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_draft_days_on_day_id ON public.draft_days USING btree (day_id);


--
-- Name: index_draft_days_on_photo_import_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_draft_days_on_photo_import_id ON public.draft_days USING btree (photo_import_id);


--
-- Name: index_draft_days_on_resort_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_draft_days_on_resort_id ON public.draft_days USING btree (resort_id);


--
-- Name: index_draft_days_on_text_import_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_draft_days_on_text_import_id ON public.draft_days USING btree (text_import_id);


--
-- Name: index_google_sheet_integrations_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_google_sheet_integrations_on_user_id ON public.google_sheet_integrations USING btree (user_id);


--
-- Name: index_photo_imports_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_photo_imports_on_user_id ON public.photo_imports USING btree (user_id);


--
-- Name: index_photos_on_day_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_photos_on_day_id ON public.photos USING btree (day_id);


--
-- Name: index_photos_on_draft_day_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_photos_on_draft_day_id ON public.photos USING btree (draft_day_id);


--
-- Name: index_photos_on_photo_import_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_photos_on_photo_import_id ON public.photos USING btree (photo_import_id);


--
-- Name: index_photos_on_resort_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_photos_on_resort_id ON public.photos USING btree (resort_id);


--
-- Name: index_photos_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_photos_on_user_id ON public.photos USING btree (user_id);


--
-- Name: index_resorts_on_normalized_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_resorts_on_normalized_name ON public.resorts USING gist (normalized_name public.gist_trgm_ops);


--
-- Name: index_resorts_on_suggested_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_resorts_on_suggested_by ON public.resorts USING btree (suggested_by);


--
-- Name: index_season_goals_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_season_goals_on_user_id ON public.season_goals USING btree (user_id);


--
-- Name: index_season_goals_on_user_id_and_season_start_year; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_season_goals_on_user_id_and_season_start_year ON public.season_goals USING btree (user_id, season_start_year);


--
-- Name: index_skis_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_skis_on_user_id ON public.skis USING btree (user_id);


--
-- Name: index_tag_days_on_day_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_tag_days_on_day_id ON public.tag_days USING btree (day_id);


--
-- Name: index_tag_days_on_day_id_and_tag_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_tag_days_on_day_id_and_tag_id ON public.tag_days USING btree (day_id, tag_id);


--
-- Name: index_tag_days_on_tag_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_tag_days_on_tag_id ON public.tag_days USING btree (tag_id);


--
-- Name: index_tags_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_tags_on_user_id ON public.tags USING btree (user_id);


--
-- Name: index_tags_on_user_id_and_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_tags_on_user_id_and_name ON public.tags USING btree (user_id, name);


--
-- Name: index_text_imports_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_text_imports_on_user_id ON public.text_imports USING btree (user_id);


--
-- Name: index_users_on_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_users_on_email ON public.users USING btree (email);


--
-- Name: index_users_on_lower_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_lower_username ON public.users USING btree (lower((username)::text));


--
-- Name: skis fk_rails_0249827881; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skis
    ADD CONSTRAINT fk_rails_0249827881 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: days fk_rails_0c6a8d09bb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.days
    ADD CONSTRAINT fk_rails_0c6a8d09bb FOREIGN KEY (resort_id) REFERENCES public.resorts(id);


--
-- Name: photos fk_rails_1ac803375b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT fk_rails_1ac803375b FOREIGN KEY (day_id) REFERENCES public.days(id);


--
-- Name: google_sheet_integrations fk_rails_1cfd6a333e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_sheet_integrations
    ADD CONSTRAINT fk_rails_1cfd6a333e FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: photo_imports fk_rails_439e345dbd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photo_imports
    ADD CONSTRAINT fk_rails_439e345dbd FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: resorts fk_rails_59f141646a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resorts
    ADD CONSTRAINT fk_rails_59f141646a FOREIGN KEY (suggested_by) REFERENCES public.users(id);


--
-- Name: draft_days fk_rails_67a15fe389; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_days
    ADD CONSTRAINT fk_rails_67a15fe389 FOREIGN KEY (day_id) REFERENCES public.days(id);


--
-- Name: photos fk_rails_7f028822e1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT fk_rails_7f028822e1 FOREIGN KEY (photo_import_id) REFERENCES public.photo_imports(id);


--
-- Name: active_storage_variant_records fk_rails_993965df05; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_variant_records
    ADD CONSTRAINT fk_rails_993965df05 FOREIGN KEY (blob_id) REFERENCES public.active_storage_blobs(id);


--
-- Name: days fk_rails_9a520c0e8f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.days
    ADD CONSTRAINT fk_rails_9a520c0e8f FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: photos fk_rails_abbf718543; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT fk_rails_abbf718543 FOREIGN KEY (resort_id) REFERENCES public.resorts(id);


--
-- Name: draft_days fk_rails_b973de63fc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_days
    ADD CONSTRAINT fk_rails_b973de63fc FOREIGN KEY (photo_import_id) REFERENCES public.photo_imports(id);


--
-- Name: active_storage_attachments fk_rails_c3b3935057; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_attachments
    ADD CONSTRAINT fk_rails_c3b3935057 FOREIGN KEY (blob_id) REFERENCES public.active_storage_blobs(id);


--
-- Name: photos fk_rails_c79d76afc0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT fk_rails_c79d76afc0 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: photos fk_rails_ca324dbc81; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT fk_rails_ca324dbc81 FOREIGN KEY (draft_day_id) REFERENCES public.draft_days(id);


--
-- Name: draft_days fk_rails_cc88a79625; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_days
    ADD CONSTRAINT fk_rails_cc88a79625 FOREIGN KEY (resort_id) REFERENCES public.resorts(id);


--
-- Name: text_imports fk_rails_ccd0cfcda0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.text_imports
    ADD CONSTRAINT fk_rails_ccd0cfcda0 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: tag_days fk_rails_d3bbb4921d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_days
    ADD CONSTRAINT fk_rails_d3bbb4921d FOREIGN KEY (tag_id) REFERENCES public.tags(id);


--
-- Name: tag_days fk_rails_d902bb5dc0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_days
    ADD CONSTRAINT fk_rails_d902bb5dc0 FOREIGN KEY (day_id) REFERENCES public.days(id) ON DELETE CASCADE;


--
-- Name: tags fk_rails_e689f6d0cc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT fk_rails_e689f6d0cc FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: draft_days fk_rails_eb6dded8d4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_days
    ADD CONSTRAINT fk_rails_eb6dded8d4 FOREIGN KEY (text_import_id) REFERENCES public.text_imports(id);


--
-- PostgreSQL database dump complete
--

SET search_path TO "$user", public;

INSERT INTO "schema_migrations" (version) VALUES
('20260207150000'),
('20260206133228'),
('20260202220009'),
('20251207120500'),
('20251207120000'),
('20251120124144'),
('20251115205425'),
('20250612090000'),
('20250604122754'),
('20250603123517'),
('20250603123305'),
('20250603121554'),
('20250530100236'),
('20250525064404'),
('20250521141526'),
('20250515081850'),
('20250510072251'),
('20250509182404'),
('20250509181957'),
('20250507082436'),
('20250505111757'),
('20250429135612'),
('20250429135447'),
('20250429135407'),
('20250425172618'),
('20250424133510'),
('20250424130817'),
('20250422182429'),
('20250422142545'),
('20250421074041'),
('20250421073910'),
('20250418205653'),
('20250418111834');

