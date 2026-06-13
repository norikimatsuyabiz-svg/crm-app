-- ============================================================
-- 顧客管理アプリ — Supabase スキーマ & 初期データ
-- Supabase SQL Editor で一発実行できます。
-- 再実行時もクリーンアップが安全に通ります。
-- ============================================================


-- ============================================================
-- 1. クリーンアップ（初回実行でも安全）
--    CASCADE により紐付くトリガ・ポリシー・インデックスも削除
-- ============================================================

DROP TABLE IF EXISTS deals     CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- updated_at 更新関数（再作成するので先に削除）
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;


-- ============================================================
-- 2. テーブル作成
-- ============================================================

CREATE TABLE customers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company    text        NOT NULL,
  name       text        NOT NULL,
  title      text,
  email      text,
  phone      text,
  memo       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE deals (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid        NOT NULL
                          REFERENCES customers(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  amount      integer     CHECK (amount IS NULL OR amount >= 0),
  status      text        NOT NULL
                          CHECK (status IN ('lead', 'proposal', 'won')),
  memo        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- deals.customer_id の検索・JOIN を高速化
CREATE INDEX deals_customer_id_idx ON deals (customer_id);


-- ============================================================
-- 3. updated_at 自動更新トリガ
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER deals_set_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 4. RLS 有効化
-- ============================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals     ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 5. RLS ポリシー
--    anon ロール = Publishable key（フロントエンドから全操作を許可）
--    ひとり営業用の個人ツールのため、全行を対象とする USING (true)
-- ============================================================

-- customers（4ポリシー）
CREATE POLICY "customers_select"
  ON customers FOR SELECT TO anon USING (true);

CREATE POLICY "customers_insert"
  ON customers FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "customers_update"
  ON customers FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "customers_delete"
  ON customers FOR DELETE TO anon USING (true);

-- deals（4ポリシー）
CREATE POLICY "deals_select"
  ON deals FOR SELECT TO anon USING (true);

CREATE POLICY "deals_insert"
  ON deals FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "deals_update"
  ON deals FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "deals_delete"
  ON deals FOR DELETE TO anon USING (true);


-- ============================================================
-- 6. 初期データ
--    UUID を固定して deals.customer_id との整合を保証する
-- ============================================================

INSERT INTO customers (id, company, name, title, email, phone, memo)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '株式会社テラノバ',
    '北村 恵',
    '購買部長',
    'kitamura@terranova.example',
    '03-1234-5678',
    '毎月第一週に定例打ち合わせあり'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'ミドリ工業株式会社',
    '坂本 龍一郎',
    '代表取締役',
    'sakamoto@midori-ind.example',
    '06-9876-5432',
    ''
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'フォレスト・パートナーズ合同会社',
    '橘 みなみ',
    '事業開発マネージャー',
    'tachibana@forest-p.example',
    '',
    '来季予算確定後に再提案予定'
  );

INSERT INTO deals (customer_id, title, amount, status, memo)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'クラウド移行支援',
    1200000,
    'won',
    '契約締結済み。次フェーズ検討中。'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '業務効率化ツール導入',
    480000,
    'proposal',
    '見積書送付済み。先方確認待ち。'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '製造ライン最適化コンサル',
    980000,
    'proposal',
    '社内稟議中。'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '新規事業調査レポート',
    NULL,
    'lead',
    ''
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'マーケティング支援契約',
    250000,
    'lead',
    '資料送付待ち。'
  );
