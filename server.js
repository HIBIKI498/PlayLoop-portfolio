// server.js
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { readConfig } = require('./server/config.cjs');
const { createAuthentication, requireOwnUser } = require('./server/auth.cjs');
function createApp({ connection, verifyIdToken, config }) {
const app = express();
app.use(cors({ origin: config.corsOrigin }));


// 🔴 復活: JSON形式のリクエスト（ユーザー登録など）を受け取るために必要です
app.use(express.json({ limit: '100kb' }));
app.use('/api', createAuthentication(verifyIdToken)); 

// ==============================
// uploads フォルダが無ければ作成
// ==============================
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// ==============================
// 画像公開用
// ==============================
app.use("/uploads", express.static("uploads"));

// ==============================
// MySQL接続設定
// ==============================


// ==============================
// 画像アップロード設定（multer）
// ==============================
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const extension = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype];
    cb(null, randomUUID() + extension);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => {
    cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
  },
});

// ==============================
// ユーザー登録API
// ==============================
app.post("/api/register", (req, res) => {
  const { username } = req.body;
  const { uid, email } = req.auth;
  if (!email || !username) return res.status(400).json({ error: 'Username and verified token email are required' });
  // ... (変更なし) ...
  const sql = "INSERT INTO T_ACCOUNT (f_uid, f_username, f_mailaddress) VALUES (?, ?, ?)";
  connection.query(sql, [uid, username, email], (err, result) => {
    if (err) {
      console.error("REGISTER ERROR:", err.code || 'request-failed');
      return res.status(500).json({ error: "データベース登録エラー" });
    }
    res.json({ message: "登録完了", id: result.insertId });
  });
});

// ==============================
// 公開プロフィールと本人の更新API
// ==============================
// Public profiles contain only display names, never email addresses.
app.get('/api/users/:uid', (req, res) => {
  connection.query('SELECT f_username FROM t_account WHERE f_uid = ?', [req.params.uid], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results[0] || { f_username: null });
  });
});

app.put('/api/users/:uid', requireOwnUser, (req, res) => {
  const { username } = req.body;
  if (typeof username !== 'string' || !username.trim()) return res.status(400).json({ error: 'Username required' });
  connection.query('UPDATE t_account SET f_username = ? WHERE f_uid = ?', [username.trim(), req.auth.uid], (err) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  });
});

// ==============================
// 商品出品API (修正箇所)
// ==============================
app.post("/api/products", upload.array("images", 6), (req, res) => {

  try {
    const uid = req.auth.uid;
    const {
      productName,
      category,
      condition,
      platform,
      shipping,
      region,
      days,
      description,
      price,
    } = req.body;

    // uidが無い場合のエラーハンドリング
    if (!uid) {
        return res.status(400).json({ error: "ログイン情報が見つかりません" });
    }

    // 価格を数値に変換
    const numericPrice = Number(String(price).replace(/[^0-9]/g, ""));
    if (isNaN(numericPrice)) {
      return res.status(400).json({ error: "価格が不正です" });
    }

    // 画像URL配列
    const imageUrls = req.files.map((file) => `/uploads/${file.filename}`);

    // 🔴 seller_uid を追加
    const sql = `
      INSERT INTO T_PRODUCTS
      (seller_uid, product_name, category, \`condition\`, platform, shipping, region, days, description, price, image_urls)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    connection.query(
      sql,
      [
        uid,
        productName,
        category,
        condition,
        platform,
        shipping,
        region,
        days,
        description,
        numericPrice,
        JSON.stringify(imageUrls),
      ],
      (err, result) => {
        if (err) {
          console.error("SQL ERROR:", err.code || 'request-failed');
          return res.status(500).json({ error: "商品登録エラー" });
        }

        res.json({ message: "出品完了", id: result.insertId });
      }
    );
  } catch (err) {
    console.error("SERVER ERROR:", err.code || 'request-failed');
    res.status(500).json({ error: "サーバーエラー" });
  }
});

// ==============================
// 商品情報の更新 (PUT)
// ==============================
app.put('/api/products/:id', upload.array('images', 6), (req, res) => {
    const productId = req.params.id;
    const { productName, category, condition, platform, shipping, region, days, description, price } = req.body;
    const uid = req.auth.uid;

    // 画像がアップロードされた場合は画像パスも更新、されなければテキスト情報のみ更新
    let sql;
    let params;

    if (req.files && req.files.length > 0) {
        // 画像あり更新
        const image_urls = JSON.stringify(req.files.map(file => file.path)); 
        sql = `UPDATE T_PRODUCTS SET 
            product_name=?, category=?, \`condition\`=?, platform=?, shipping=?, region=?, days=?, description=?, price=?, image_urls=? 
            WHERE id=? AND seller_uid=?`;
        params = [productName, category, condition, platform, shipping, region, days, description, price, image_urls, productId, uid];
    } else {
        // 画像なし更新（画像は既存のまま）
        sql = `UPDATE T_PRODUCTS SET 
            product_name=?, category=?, \`condition\`=?, platform=?, shipping=?, region=?, days=?, description=?, price=? 
            WHERE id=? AND seller_uid=?`;
        params = [productName, category, condition, platform, shipping, region, days, description, price, productId, uid];
    }

    connection.query(sql, params, (err, result) => {
        if (err) {
            console.error(err.code || 'request-failed');
            res.status(500).json({ error: 'Database Error' });
            return;
        }
        res.json({ message: 'Update success' });
    });
});


// ==============================
// 商品の削除 (DELETE)
// ==============================
app.delete('/api/products/:id', (req, res) => {
    const productId = req.params.id;
    const uid = req.auth.uid; // 削除権限確認用

    // 本当はここで画像ファイルの削除処理も入れるのがベストですが、今回はDB削除のみ実装します
    const sql = "DELETE FROM T_PRODUCTS WHERE id = ? AND seller_uid = ?";
    
    connection.query(sql, [productId, uid], (err, result) => {
        if (err) {
            console.error(err.code || 'request-failed');
            res.status(500).send('Database Error');
            return;
        }
        res.json({ message: 'Delete success' });
    });
});


// ==============================
// 注目商品取得API (いいね数順)
// ==============================
app.get('/api/products/hot', (req, res) => {
    // いいね数が多い順に取得する（いいねが1つ以上あるもの）
    const sql = `
        SELECT p.*, COUNT(f.id) AS favorite_count 
        FROM T_PRODUCTS p 
        JOIN T_FAVORITES f ON p.id = f.product_id 
        WHERE p.status = 'sale' 
        GROUP BY p.id 
        ORDER BY favorite_count DESC, p.created_at DESC
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error(err.code || 'request-failed');
            res.status(500).send('Database Error');
            return;
        }
        res.json(results);
    });
});


// ==============================
// いいね機能関連API
// ==============================

// ① 商品のいいね状態と件数を取得する
app.get('/api/favorites/:productId', (req, res) => {
    const productId = req.params.productId;
    const uid = req.auth?.uid; // ログインしていない場合は undefined

    // まず、その商品の全いいね数を取得
    const countSql = "SELECT COUNT(*) as count FROM T_FAVORITES WHERE product_id = ?";
    connection.query(countSql, [productId], (err, countResults) => {
        if (err) return res.status(500).json({ error: 'Database Error' });
        
        const count = countResults[0].count;

        // ログインしていない場合は件数だけ返す
        if (!uid || uid === 'null') {
            return res.json({ isLiked: false, count: count });
        }

        // ログインしている場合は、そのユーザーがいいねしているかチェック
        const checkSql = "SELECT id FROM T_FAVORITES WHERE product_id = ? AND user_uid = ?";
        connection.query(checkSql, [productId, uid], (err, checkResults) => {
            if (err) return res.status(500).json({ error: 'Database Error' });
            
            const isLiked = checkResults.length > 0;
            res.json({ isLiked, count });
        });
    });
});

// ② いいねを登録する (POST)
app.post('/api/favorites', (req, res) => {
    const { productId } = req.body;
    const uid = req.auth.uid;
    if (!uid || !productId) return res.status(400).json({ error: 'Missing data' });

    // 重複エラーを防ぐため INSERT IGNORE を使用
    const sql = "INSERT IGNORE INTO T_FAVORITES (user_uid, product_id) VALUES (?, ?)";
    connection.query(sql, [uid, productId], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database Error' });
        res.json({ success: true });
    });
});

// ③ いいねを解除する (DELETE)
app.delete('/api/favorites', (req, res) => {
    const { productId } = req.body;
    const uid = req.auth.uid;
    if (!uid || !productId) return res.status(400).json({ error: 'Missing data' });

    const sql = "DELETE FROM T_FAVORITES WHERE user_uid = ? AND product_id = ?";
    connection.query(sql, [uid, productId], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database Error' });
        res.json({ success: true });
    });
});


// ==============================
// いいねした商品一覧を取得するAPI
// ==============================
app.get('/api/my-favorites', (req, res) => {
    const uid = req.auth?.uid;
    
    // T_FAVORITESとT_PRODUCTSを結合して、いいねした順(降順)で取得
    const sql = `
        SELECT 
            p.*, 
            f.created_at as favorited_at,
            (SELECT COUNT(*) FROM T_FAVORITES WHERE product_id = p.id) AS favorite_count
        FROM T_FAVORITES f
        JOIN T_PRODUCTS p ON f.product_id = p.id
        WHERE f.user_uid = ?
        ORDER BY f.created_at DESC
    `;
    
    connection.query(sql, [uid], (err, results) => {
        if (err) {
            console.error(err.code || 'request-failed');
            res.status(500).send('Database Error');
            return;
        }
        res.json(results);
    });
});


// ==============================
// 商品一覧取得API (新着順) 
// ==============================
app.get('/api/products', (req, res) => {
    // 降順(新しい順)で取得しつつ、いいね数 (favorite_count) も取得する
    const sql = `
        SELECT p.*, COUNT(f.id) AS favorite_count 
        FROM T_PRODUCTS p 
        LEFT JOIN T_FAVORITES f ON p.id = f.product_id 
        WHERE p.status = 'sale' 
        GROUP BY p.id 
        ORDER BY p.created_at DESC
    `;
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error(err.code || 'request-failed');
            res.status(500).send('Database Error');
            return;
        }
        res.json(results);
    });
});



// ==============================
// 商品詳細取得API
// ==============================
app.get('/api/products/:id', (req, res) => {
    const productId = req.params.id;
    const sql = 'SELECT * FROM T_PRODUCTS WHERE id = ?';
    
    connection.query(sql, [productId], (err, result) => {
        if (err) {
            console.error(err.code || 'request-failed');
            res.status(500).send('Database Error');
            return;
        }
        res.json(result[0]);
    });
});


// ==============================
// 商品コメント関連API
// ==============================

// ① 特定の商品のコメント一覧を取得する
app.get('/api/products/:productId/comments', (req, res) => {
    const productId = req.params.productId;

    const sql = `
        SELECT c.*, a.f_username 
        FROM T_PRODUCT_COMMENTS c 
        JOIN t_account a ON c.user_uid = a.f_uid 
        WHERE c.product_id = ? 
        ORDER BY c.created_at ASC
    `;

    connection.query(sql, [productId], (err, results) => {
        if (err) {
            console.error(err.code || 'request-failed');
            return res.status(500).send('Database Error');
        }
        res.json(results);
    });
});

// ② コメントを投稿する (変更なし)
app.post('/api/products/:productId/comments', (req, res) => {
    const productId = req.params.productId;
    const { comment } = req.body;
    const user_uid = req.auth.uid;

    if (!user_uid || !comment) {
        return res.status(400).send('Missing data');
    }

    const sql = "INSERT INTO T_PRODUCT_COMMENTS (product_id, user_uid, comment) VALUES (?, ?, ?)";
    connection.query(sql, [productId, user_uid, comment], (err, result) => {
        if (err) {
            console.error(err.code || 'request-failed');
            return res.status(500).send('Database Error');
        }
        res.json({ success: true, commentId: result.insertId });
    });
});


// ==============================
// ユーザー自身の出品商品取得API 
// ==============================
app.get("/api/my-products", (req, res) => {
  const uid = req.auth?.uid;
  
  if (!uid) {
    return res.status(400).json({ error: "ユーザーIDが必要です" });
  }

  const sql = `
    SELECT
      id,
      product_name,
      price,
      image_urls,
      seller_uid,
      buyer_uid,  
      status 
    FROM T_PRODUCTS
    WHERE seller_uid = ?
    ORDER BY id DESC
  `;

  connection.query(sql, [uid], (err, results) => {
    if (err) {
      console.error("MY PRODUCTS ERROR:", err.code || 'request-failed');
      return res.status(500).json({ error: "取得エラー" });
    }
    res.json(results);
  });
});



// ==============================
// 購入処理API 
// ==============================
app.post('/api/purchase/:productId', (req, res) => { 
    const productId = req.params.productId;
    const uid = req.auth.uid;               

    if (!productId || !uid) {
        return res.status(400).send('Missing productId or uid');
    }

    // 1. まず商品が既に売り切れていないかチェック
    const checkSql = "SELECT status FROM T_PRODUCTS WHERE id = ?";
    connection.query(checkSql, [productId], (err, results) => {
        if (err) {
            console.error(err.code || 'request-failed');
            return res.status(500).send('Database Error');
        }
        
        if (results.length === 0) {
            return res.status(404).send('商品が見つかりません');
        }

        if (results[0].status === 'sold') {
            return res.status(400).send('この商品は既に売り切れです');
        }

        // 2. ステータスを 'sold' にし、buyer_uid を記録する
        const updateSql = "UPDATE T_PRODUCTS SET status = 'sold', buyer_uid = ? WHERE id = ?";
        connection.query(updateSql, [uid, productId], (err, result) => {
            if (err) {
                console.error(err.code || 'request-failed');
                return res.status(500).send('Purchase Failed');
            }
            res.json({ success: true, message: '購入が完了しました' });
        });
    });
});

// ==============================
// 購入履歴を取得するAPI
// ==============================
app.get('/api/my-purchase', (req, res) => {
    const uid = req.auth?.uid;
    
    // buyer_uid が指定したUIDと一致する商品を取得
    const sql = "SELECT * FROM T_PRODUCTS WHERE buyer_uid = ? ORDER BY created_at DESC";
    
    connection.query(sql, [uid], (err, results) => {
        if (err) {
            console.error(err.code || 'request-failed');
            res.status(500).send('Database Error');
            return;
        }
        res.json(results);
    });
});

// ==============================
// 掲示板機能 API
// ==============================

// 1. スレッド一覧の取得
app.get('/api/forum/posts', (req, res) => {
    const sql = `
        SELECT p.id, p.title, p.category, p.content, p.image_url, p.created_at, a.f_username,
               (SELECT COUNT(*) FROM T_BOARD_LIKES WHERE post_id = p.id) as like_count,
               (SELECT COUNT(*) FROM T_BOARD_COMMENTS WHERE post_id = p.id) as comment_count
        FROM T_BOARD_POSTS p
        LEFT JOIN t_account a ON p.author_uid = a.f_uid
        ORDER BY p.created_at DESC
    `;
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json(results);
    });
});

// 2. 新規スレッドの投稿
app.post('/api/forum/posts', upload.single('image'), (req, res) => {
    const { title, content, category } = req.body;
    const author_uid = req.auth.uid;
    
    // 画像がアップロードされた場合はそのパスを取得、なければ null
    const image_url = req.file ? req.file.path : null;

    if (!author_uid || !title || !content) return res.status(400).send('Missing data');

    const sql = "INSERT INTO T_BOARD_POSTS (author_uid, title, content, category, image_url) VALUES (?, ?, ?, ?, ?)";
    connection.query(sql, [author_uid, title, content, category, image_url], (err, result) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json({ success: true, postId: result.insertId });
    });
});

// 3. スレッド詳細の取得
app.get('/api/forum/posts/:id', (req, res) => {
    const sql = `
        SELECT p.*, a.f_username 
        FROM T_BOARD_POSTS p
        LEFT JOIN t_account a ON p.author_uid = a.f_uid
        WHERE p.id = ?
    `;
    connection.query(sql, [req.params.id], (err, results) => {
        if (err || results.length === 0) return res.status(404).send('Not Found');
        res.json(results[0]);
    });
});

// 4. スレッドのコメント一覧取得
app.get('/api/forum/posts/:id/comments', (req, res) => {
    const sql = `
        SELECT c.*, a.f_username 
        FROM T_BOARD_COMMENTS c
        LEFT JOIN t_account a ON c.author_uid = a.f_uid
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
    `;
    connection.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).send('DB Error');
        res.json(results);
    });
});

// 5. コメントの投稿
app.post('/api/forum/posts/:id/comments', upload.single('image'), (req, res) => {
    const { content } = req.body;
    const author_uid = req.auth.uid;
    
    // 画像がアップロードされた場合はそのパスを取得、なければ null
    const image_url = req.file ? req.file.path : null;

    if (!author_uid || !content) return res.status(400).send('Missing data');

    const sql = "INSERT INTO T_BOARD_COMMENTS (post_id, author_uid, content, image_url) VALUES (?, ?, ?, ?)";
    connection.query(sql, [req.params.id, author_uid, content, image_url], (err) => {
        if (err) {
            console.error("コメント投稿エラー:", err.code || 'request-failed');
            return res.status(500).send('DB Error');
        }
        res.json({ success: true });
    });
});

// 6. リアクション（Good job!）の取得・追加・削除
app.get('/api/forum/posts/:id/likes', (req, res) => {
    const uid = req.auth?.uid;
    const countSql = "SELECT COUNT(*) as count FROM T_BOARD_LIKES WHERE post_id = ?";
    connection.query(countSql, [req.params.id], (err, countRes) => {
        if (err) return res.status(500).send('DB Error');
        const count = countRes[0].count;
        if (!uid) return res.json({ isLiked: false, count });

        const checkSql = "SELECT id FROM T_BOARD_LIKES WHERE post_id = ? AND user_uid = ?";
        connection.query(checkSql, [req.params.id, uid], (err, checkRes) => {
            res.json({ isLiked: checkRes && checkRes.length > 0, count });
        });
    });
});

app.post('/api/forum/posts/:id/likes', (req, res) => {
    const uid = req.auth.uid;
    const sql = "INSERT IGNORE INTO T_BOARD_LIKES (post_id, user_uid) VALUES (?, ?)";
    connection.query(sql, [req.params.id, uid], () => res.json({ success: true }));
});

app.delete('/api/forum/posts/:id/likes', (req, res) => {
    const uid = req.auth.uid;
    const sql = "DELETE FROM T_BOARD_LIKES WHERE post_id = ? AND user_uid = ?";
    connection.query(sql, [req.params.id, uid], () => res.json({ success: true }));
});

// ==============================
// Unexpected errors must not return database queries or local paths to clients.
app.use((err, _req, res, _next) => {
  console.error(err.code || 'request-failed');
  res.status(500).json({ error: 'Request failed' });
});
return app;
}

if (require.main === module) {
  const config = readConfig();
  const firebaseApp = initializeApp({ projectId: config.firebaseProjectId });
  const connection = mysql.createConnection(config.database);
  const app = createApp({ connection, config, verifyIdToken: (token) => getAuth(firebaseApp).verifyIdToken(token) });
  app.listen(config.port, config.host, () => {
    console.log(`Server listening on ${config.host}:${config.port}`);
  });
}
module.exports = { createApp };
