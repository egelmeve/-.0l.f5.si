const express = require('express');
const app = express();
const PORT = 3000;
const ytdl = require('@distube/ytdl-core');

// 動画のストリーミング関数
const streamVideo = (id, resolution, res) => {
const url = 'https://www.youtube.com/watch?v=' + id;

// YouTube動画のストリーミング
const video = ytdl(url, {
filter: format => format.container === 'mp4' && format.audioBitrate > 0 && format.height <= 720,
quality: resolution
});

// ヘッダーを設定して、応答としてストリームを返します
res.setHeader('Content-Type', 'video/mp4');

// ファイルを直接パイプする
video.pipe(res)
.on('finish', () => {
console.log(`動画がストリーミングされました（画質: ${resolution}）：${id}`);
})
.on('error', (err) => {
console.error('エラーが発生しました:', err);
// エラーが発生した場合は他の画質を試す
if (resolution === 'highestvideo') {
console.log('次は標準画質（720p）を試します。');
streamVideo(id, 'lowest', res); // 最低画質を試す
} else {
res.status(500).send('エラーが発生しました。');
}
});
}

app.get('/stream/:id', (req, res) => {
const videoId = req.params.id; // URLのパラメータから動画IDを取得
streamVideo(videoId, 'highestvideo', res); // 最初は最高画質でストリーミングを試みる
});

app.listen(PORT, () => {
console.log(`サーバーがポート ${PORT} で起動しました！`);
});
