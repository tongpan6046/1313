
// IndexedDB 設定
const dbName = "13CardsDB";
let db;
let lastAction = null; // 用來儲存最後一次動作
let lastRoundState = []; // 儲存上一輪的完整狀態

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
        if (!db.objectStoreNames.contains("history")) {
            db.createObjectStore("history", { autoIncrement: true });
        }
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        loadPlayers();
        loadHistory();
        loadPastRounds();
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

// 提交本局（記錄輸入的數據並檢查是否平衡）
function submitRound() {
    lastRoundState = []; // 清空上次的數據
    let inputs = document.querySelectorAll("#playerTable input");
    let total = 0;
    let roundData = [];

    inputs.forEach(input => {
        let player = input.dataset.player;
        let score = parseInt(input.value);

        if (!isNaN(score)) {
            lastRoundState.push({ player: player, score: score }); // 儲存本局狀態

            let transaction = db.transaction(["scores"], "readwrite");
            let store = transaction.objectStore("scores");
            store.add({ player: player, score: score, date: new Date().toISOString() });

            total += score;
            roundData.push({ player: player, score: score });
        }
    });

    if (total !== 0) {
        document.getElementById("balanceWarning").textContent = "⚠️ 注數不平衡！請檢查數據";
    } else {
        document.getElementById("balanceWarning").textContent = "";
    }

    // 儲存這局的歷史記錄
    let historyTransaction = db.transaction(["history"], "readwrite");
    let historyStore = historyTransaction.objectStore("history");
    historyStore.add({ round: roundData, date: new Date().toISOString() });

    lastAction = "submitRound"; // 記錄這次的動作
    loadHistory();
    loadPastRounds(); // 更新歷史回顧
}

// **撤銷上一次動作（恢復到上一局）**
function undoLastAction() {
    if (lastAction === "submitRound" && lastRoundState.length > 0) {
        let transaction = db.transaction(["scores"], "readwrite");
        let store = transaction.objectStore("scores");
        store.clear(); // 清除最新輸入的數據

        // 恢復上一局的數據
        lastRoundState.forEach(entry => {
            store.add({ player: entry.player, score: entry.score, date: new Date().toISOString() });
        });

        lastRoundState = []; // 清空撤銷後的記錄
        lastAction = null; // 重置最後動作狀態
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

// 加載歷史回顧紀錄
function loadPastRounds() {
    let transaction = db.transaction(["history"], "readonly");
    let store = transaction.objectStore("history");
    let request = store.getAll();

    request.onsuccess = (event) => {
        let rounds = event.target.result;
        let historyContainer = document.getElementById("historyRecords");
        historyContainer.innerHTML = "<h2>歷史回顧</h2>";

        rounds.forEach((roundEntry, index) => {
            let div = document.createElement("div");
            div.classList.add("history-entry");
            div.innerHTML = `<p>對局 ${index + 1} - ${new Date(roundEntry.date).toLocaleString()}</p>`;
            roundEntry.round.forEach(playerData => {
                div.innerHTML += `<p>${playerData.player}: ${playerData.score} 注</p>`;
            });
            historyContainer.appendChild(div);
        });
    };
}
