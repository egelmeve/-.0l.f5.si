const express = require('express');
const http = require('http'); // HTTPプロキシ用
const https = require('https'); // HTTPSプロキシ用（自身のサーバーをHTTPSで起動する場合）
const net = require('net'); // CONNECTメソッド用
const fs = require('fs'); // 証明書読み込み用

const app = express();

const HTTP_PORT = 3000; // HTTPプロキシのポート
const HTTPS_PORT = 3001; // HTTPSプロキシのポート (オプション)

// --- HTTPプロキシ部分 ---
// クライアントからプロキシへのHTTPリクエストを処理
app.use((req, res, next) => {
    // HTTPリクエストはそのままターゲットに転送
    // ここで `http://` や `https://` で始まる完全なURLを処理する
    const targetUrl = req.url; // リクエストURLはブラウザが完全URLで送ってくる場合とパスのみの場合がある
    let protocol, hostname, port, path;

    try {
        const url = new URL(targetUrl);
        protocol = url.protocol;
        hostname = url.hostname;
        port = url.port || (protocol === 'http:' ? 80 : 443);
        path = url.pathname + url.search;
    } catch (e) {
        // パスのみのリクエスト（例: /somepath）が来た場合、プロキシではない通常のExpressルートとして処理
        // またはエラーを返す
        console.warn(`Invalid URL for proxy or path-only request: ${targetUrl}`);
        return next(); // 次のミドルウェアまたはルートへ
    }

    // `http:` または `https:` プロトコルに対応
    const requester = (protocol === 'https:') ? https : http;

    const options = {
        hostname: hostname,
        port: port,
        path: path,
        method: req.method,
        headers: { ...req.headers } // クライアントからのヘッダーをコピー
    };

    // Proxy-Connection ヘッダーは削除またはConnectionに変更
    delete options.headers['proxy-connection'];
    options.headers['connection'] = 'close'; // 接続を閉じることで効率を上げる

    console.log(`[HTTP Proxy] ${req.method} ${targetUrl}`);

    const proxyReq = requester.request(options, (proxyRes) => {
        // ターゲットからのレスポンスをクライアントに転送
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error(`[HTTP Proxy Error] ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Proxy Error: ' + err.message);
    });

    // クライアントからのリクエストボディをターゲットに転送
    req.pipe(proxyReq);
});

// --- HTTPSトンネリング (CONNECTメソッド) 部分 ---
// http.createServer または https.createServer の `connect` イベントをリッスン
// Expressのapp.listenではなく、直接http/httpsモジュールのサーバーインスタンスが必要
const httpServer = http.createServer(app); // ExpressアプリをHTTPサーバーのリスナーとして使う

httpServer.on('connect', (req, clientSocket, head) => {
    // CONNECTメソッドはHTTP/HTTPSどちらのサーバーでも処理可能だが、通常はHTTPポートで受ける
    const [hostname, port] = req.url.split(':');
    const targetPort = port || 443; // HTTPSのデフォルトポートは443

    console.log(`[HTTPS Tunnel] CONNECT ${req.url}`);

    // ターゲットサーバーへのTCP接続を確立
    const serverSocket = net.connect(targetPort, hostname, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        serverSocket.write(head); // クライアントから送られてきた最初のデータがあれば転送
        
        // 双方向のデータ転送を開始
        clientSocket.pipe(serverSocket);
        serverSocket.pipe(clientSocket);
    });

    serverSocket.on('error', (err) => {
        console.error(`[HTTPS Tunnel Server Error] ${err.message}`);
        clientSocket.end('HTTP/1.1 500 Connection Error\r\n\r\n' + err.message);
    });

    clientSocket.on('error', (err) => {
        console.error(`[HTTPS Tunnel Client Error] ${err.message}`);
        serverSocket.end();
    });

    // クライアント/サーバーどちらかの接続が閉じられたら、もう一方も閉じる
    clientSocket.on('end', () => serverSocket.end());
    serverSocket.on('end', () => clientSocket.end());
});

// --- サーバー起動 ---
httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP/HTTPS Proxy listening on port ${HTTP_PORT} (for CONNECT and HTTP)`);
});

// オプション: プロキシサーバー自体をHTTPSで起動する場合（クライアントとプロキシ間もHTTPS）
// これは通常、クライアントがブラウザのプロキシ設定で "https://" を指定する場合に使われる
// 自己署名証明書を使用する場合、ブラウザに警告が出ます。
try {
    const options = {
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem')
    };

    const httpsServer = https.createServer(options, app); // HTTPSサーバーもExpressアプリをリスナーとして使う

    httpsServer.on('connect', (req, clientSocket, head) => {
        // HTTPSプロキシサーバーのCONNECTメソッドも上記と同様に処理
        // コードの重複を避けるため、関数に切り出すと良い
        const [hostname, port] = req.url.split(':');
        const targetPort = port || 443;

        console.log(`[HTTPS Proxy HTTPS Tunnel] CONNECT ${req.url}`);

        const serverSocket = net.connect(targetPort, hostname, () => {
            clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
            serverSocket.write(head);
            clientSocket.pipe(serverSocket);
            serverSocket.pipe(clientSocket);
        });

        serverSocket.on('error', (err) => {
            console.error(`[HTTPS Proxy HTTPS Tunnel Server Error] ${err.message}`);
            clientSocket.end('HTTP/1.1 500 Connection Error\r\n\r\n' + err.message);
        });

        clientSocket.on('error', (err) => {
            console.error(`[HTTPS Proxy HTTPS Tunnel Client Error] ${err.message}`);
            serverSocket.end();
        });

        clientSocket.on('end', () => serverSocket.end());
        serverSocket.on('end', () => clientSocket.end());
    });

    httpsServer.listen(HTTPS_PORT, () => {
        console.log(`HTTPS Proxy listening on port ${HTTPS_PORT} (for CONNECT and HTTPS)`);
    });

} catch (e) {
    console.warn(`Could not start HTTPS server on port ${HTTPS_PORT}. Make sure key.pem and cert.pem exist. Error: ${e.message}`);
    console.warn("Continuing with HTTP proxy only.");
}

// 例外処理（Expressのルートにマッチしなかった場合）
app.use((req, res) => {
    res.status(404).send('Not Found or not a proxy request');
});

console.log("Proxy server starting...");
