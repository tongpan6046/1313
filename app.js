
// IndexedDB 設定
const dbName = "13CardsDB";
let db;
let lastAction = null; // 用來儲存最後一次動作
let lastScores = []; // 用來存儲上一次的注數

document.addEventListener("DOMContentLoaded", () => {
    let request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {
        let db = event.target.result;
        if (!db.objectStoreNames.contains("players")) {
            db.createObjectStore("players", { keyPath: "name" });
        }
        if (!db.objectStoreNames.contains("scores")) {
            db.createObjectStore("scores", { autoIncrement: true });
        }
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        loadPlayers();
        loadHistory();
    };
});

function addPlayer() {
    let name = document.getElementById("playerName").value.trim();
    if (name === "") return;

    let transaction = db.transaction(["players"], "readwrite");
    let store = transaction.objectStore("players");
    store.add({ name: name });

    document.getElementById("playerName").value = "";
    loadPlayers();
}

// 提交本局（記錄輸入的數據）
function submitRound() {
    lastScores = []; // 清空上次的數據
    let inputs = document.querySelectorAll("#playerTable input");

    inputs.forEach(input => {
        let player = input.dataset.player;
        let score = parseInt(input.value);

        if (!isNaN(score)) {
            lastScores.push({ player: player, score: score }); // 儲存上一次輸入的數據

            let transaction = db.transaction(["scores"], "readwrite");
            let store = transaction.objectStore("scores");
            store.add({ player: player, score: score, date: new Date().toISOString() });
        }
    });

    lastAction = "submitRound"; // 記錄這次的動作
    loadHistory();
}

// 撤銷上一次動作
function undoLastAction() {
    if (lastAction === "submitRound" && lastScores.length > 0) {
        let transaction = db.transaction(["scores"], "readwrite");
        let store = transaction.objectStore("scores");

        lastScores.forEach(entry => {
            let request = store.openCursor();
            request.onsuccess = (event) => {
                let cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.player === entry.player && cursor.value.score === entry.score) {
                        store.delete(cursor.primaryKey);
                    }
                    cursor.continue();
                }
            };
        });

        lastScores = []; // 清空撤銷後的數據
        loadHistory();
    }
}

// 重置遊戲
function resetGame() {
    let transaction = db.transaction(["scores"], "readwrite");
    let store = transaction.objectStore("scores");
    store.clear();

    lastAction = "resetGame"; // 記錄動作
    loadHistory();
}

function loadPlayers() {
    let transaction = db.transaction(["players"], "readonly");
    let store = transaction.objectStore("players");
    let request = store.getAll();

    request.onsuccess = (event) => {
        let players = event.target.result;
        let tableBody = document.getElementById("playerTable");
        tableBody.innerHTML = "";

        players.forEach(player => {
            let row = document.createElement("tr");

            let nameCell = document.createElement("td");
            nameCell.textContent = player.name;

            let scoreCell = document.createElement("td");
            scoreCell.textContent = "0"; // 預設為 0

            let inputCell = document.createElement("td");
            let input = document.createElement("input");
            input.type = "number";
            input.value = "0";
            input.dataset.player = player.name;
            inputCell.appendChild(input);

            row.appendChild(nameCell);
            row.appendChild(scoreCell);
            row.appendChild(inputCell);
            tableBody.appendChild(row);
        });
    };
}

function loadHistory() {
    let transaction = db.transaction(["scores"], "readonly");
    let store = transaction.objectStore("scores");
    let request = store.getAll();

    request.onsuccess = (event) => {
        let scores = event.target.result;
        let playerTotals = {};

        scores.forEach(entry => {
            if (!playerTotals[entry.player]) {
                playerTotals[entry.player] = 0;
            }
            playerTotals[entry.player] += entry.score;
        });

        let tableBody = document.getElementById("playerTable");

        tableBody.querySelectorAll("tr").forEach(row => {
            let playerName = row.cells[0].textContent;
            let scoreCell = row.cells[1];

            if (playerTotals[playerName] !== undefined) {
                scoreCell.textContent = playerTotals[playerName];
            } else {
                scoreCell.textContent = "0";
            }
        });
    };
}
