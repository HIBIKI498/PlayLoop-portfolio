import { apiFetch, API_BASE_URL } from '../../api';
import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth'; // Firebase認証関数
import { auth } from '../../firebase'; // 作成したfirebase設定
import '../../css/Touroku.css';

interface FirebaseError {
  code: string;
  message: string;
}

const RegisterConfirm: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 前の画面からのデータ取得
  const { state } = location;
  const username = state?.username || '';
  const email = state?.email || '';
  const password = state?.password || '';

  // 登録完了処理
  const handleComplete = async () => {
    try {
      // 1. Firebase Authentication にユーザーを作成
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. MySQL (バックエンドAPI) にユーザー情報を送信
      const response = await apiFetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,        // FirebaseのUID
          username: username,   // フォームのユーザー名
          email: email          // フォームのメールアドレス
        }),
      });

      if (!response.ok) {
        throw new Error('データベースへの保存に失敗しました');
      }

      // 3. 完了アラートと遷移
      alert("登録が完了しました");
      navigate('/'); // トップページまたはログインページへ

    } catch (error) {
      console.error("登録エラー:", error);
      
      // 2. 'any' ではなく、定義した 'FirebaseError' 型として扱います
      const firebaseError = error as FirebaseError;

      // エラーメッセージの分岐
      if (firebaseError.code === 'auth/email-already-in-use') {
        alert("このメールアドレスは既に登録されています。");
      } else {
        // messageが存在しない場合に備えて念のためフォールバック
        alert("登録中にエラーが発生しました: " + (firebaseError.message || "不明なエラー"));
      }
    }
  };


  return (
    <div className="registration-container">
      <h1>登録内容の確認</h1>
      <p className="confirm-message">以下の内容で登録します。よろしければ「登録を完了する」ボタンを押してください。</p>
      
      <table className="confirm-table">
        <tbody>
          <tr>
            <th>ユーザー名</th>
            <td>{username}</td>
          </tr>
          <tr>
            <th>メールアドレス</th>
            <td>{email}</td>
          </tr>
          <tr>
            <th>パスワード</th>
            {/* セキュリティのため表示は伏せ字 */}
            <td>********</td>
          </tr>
        </tbody>
      </table>

      <div className="button-group">
        <button onClick={handleComplete} className="register-btn">登録を完了する</button>
        {/* stateを保持したまま戻る設定 */}
        <Link to="/kanin_touroku" state={state} className="back-link">修正する</Link>
      </div>
    </div>
  );
};

export default RegisterConfirm;