/**
 * じゃんけんBOT
 */
const LINE_CHANNEL_TOKEN = '*****'; // LINE NOTIFYのアクセストークン
const SSID = '*****';
const SSN_USER = 'user';

let spreadsheet = SpreadsheetApp.openById(SSID);
let userSheet = spreadsheet.getSheetByName(SSN_USER);

/**
 * POSTリクエスト
 * @param {Object} event 
 */
function doPost(event) {
    try {
        if (event.postData) {
            let reqObj = JSON.parse(event.postData.contents);
            execute(reqObj);
        }
    } catch (e) {
        console.error(e.stack);
    }
}

/**
 * イベント処理
 * @param {Object} reqObj 
 */
function execute(reqObj) {

    for (let i in reqObj.events) {
        let reqEvent = reqObj.events[i];
        console.log(reqEvent);

        switch (reqEvent.type) {
            case 'follow':
                executeFollow(reqEvent);
                break;
            case 'unfollow':
                executeUnfollow(reqEvent);
                break;
            case 'message':
                executeMessage(reqEvent);
                break;
        }
    }
}

/**
 * Followイベント処理
 * @param {Object} reqEvent 
 */
function executeFollow(reqEvent) {
    let msgList = [{
        'type': 'text',
        'text': 'スタンプまたはメッセージでじゃんけんができます。',
    }];
    sendLinePush(reqEvent.source.userId, msgList);

    let user = getUser(reqEvent.source.userId);
    if (user) {
        userSheet.getRange(user.index + 2, 3).setValue(1);
    } else {
        userSheet.appendRow([reqEvent.source.type, reqEvent.source.userId, 1, 0, 0, 0]);
    }
}

/**
 * UnFollowイベント処理
 * @param {Object} reqEvent 
 */
function executeUnfollow(reqEvent) {
    let user = getUser(reqEvent.source.userId);
    if (user) {
        userSheet.getRange(user.index + 2, 3).setValue(0);
    }
}

/**
 * メッセージイベント処理
 * @param {Object} reqEvent 
 */
function executeMessage(reqEvent) {
    let msgList = [];
    let user = getUser(reqEvent.source.userId);
    if (user) {
        let reqHand = -1;
        switch (reqEvent.message.type) {
            case 'text':
                reqHand = getHandFromText(reqEvent.message.text);
                break;
            case 'sticker':
                reqHand = getHandFromSticker(reqEvent.message.packageId, reqEvent.message.stickerId);
                break;
        }

        if (-1 < reqHand) {
            let botHand = getRandom(0, 2);
            let judge = (reqHand - botHand + 3) % 3;

            const BOT_HAND_LIST = ['グー', 'チョキ', 'パー'];
            const RESULT_LIST = ['あいこ', 'あなたの負け', 'あなたの勝ち'];


            let winNum = user.item.winNum;
            let loseNum = user.item.loseNum;
            let drawNum = user.item.drawNum;
            switch (judge) {
                case 0:
                    drawNum++;
                    break;
                case 1:
                    loseNum++;
                    break;
                case 2:
                    winNum++;
                    break;
            }

            msgList.push({
                'type': 'text',
                'text': BOT_HAND_LIST[botHand],
            });
            msgList.push({
                'type': 'text',
                'text': `${RESULT_LIST[judge]}\n\n勝ち: ${winNum}\n負け: ${loseNum}\nあいこ: ${drawNum}`,
            });
            sendLineReply(reqEvent.replyToken, msgList);

            userSheet.getRange(user.index + 2, 4).setValue(winNum);
            userSheet.getRange(user.index + 2, 5).setValue(loseNum);
            userSheet.getRange(user.index + 2, 6).setValue(drawNum);

        } else {
            msgList.push({
                'type': 'text',
                'text': 'わからないよ\nもう一度入力してね',
            });
            sendLineReply(reqEvent.replyToken, msgList);
        }
    }
}

/**
 * テキストからの手を取得する
 * @param {String} text 
 */
function getHandFromText(text) {
    const HAND_LIST = [
        ['グー', 'ぐー', '✊', '👊'],
        ['チョキ', 'ちょき', '✌️', '✌️'],
        ['パー', 'ぱー', '✋', '🖐']
    ];
    for (let i in HAND_LIST) {
        let hand = HAND_LIST[i];
        for (let j in hand) {
            let word = hand[j];
            if (text == word) {
                return parseInt(i);
            }
        }
    }
}

/**
 * スタンプから手を取得する
 * @param {String} packageId 
 * @param {String} stickerId 
 */
function getHandFromSticker(packageId, stickerId) {
    const HAND_LIST = [
        [{
            packageId: '2000010',
            stickerId: '219905'
        }, {
            packageId: '2000000',
            stickerId: '47906'
        }],
        [{
            packageId: '2000010',
            stickerId: '219907'
        }, {
            packageId: '2000000',
            stickerId: '47904'
        }],
        [{
            packageId: '2000010',
            stickerId: '219910'
        }, {
            packageId: '2000000',
            stickerId: '47905'
        }]
    ];
    for (let i in HAND_LIST) {
        let hand = HAND_LIST[i];
        for (let j in hand) {
            let item = hand[j];
            if (item.packageId == packageId && item.stickerId == stickerId) {
                return parseInt(i);
            }
        }
    }
}

/**
 * ユーザーを取得する
 * @param {String} userId 
 */
function getUser(userId) {
    let userList = getUserList();
    for (let i in userList) {
        let user = userList[i];
        if (user.userId === userId) {
            return {
                index: parseInt(i),
                item: user
            };
        }
    }
    return null;
}

/**
 * ユーザー一覧を取得する
 */
function getUserList() {
    let userList = [];
    let lastRow = userSheet.getLastRow();
    if (1 < lastRow) {
        userList = userSheet.getRange(2, 1, lastRow, 6).getValues();
        userList = userList.map((row) => {
            return {
                type: row[0],
                userId: row[1],
                follow: row[2],
                winNum: row[3],
                loseNum: row[4],
                drawNum: row[5],
            }
        });
    }
    return userList;
}

function getRandom(min, max) {
    let random = Math.floor(Math.random() * (max + 1 - min)) + min;
    return random;
}

/**
 * LINEにメッセージを送信する
 * @param {String} targetId ターゲットID（userId/groupId/roomId）
 * @param {Object} msgList メッセージリスト
 */
function sendLinePush(targetId, msgList) {
    let url = 'https://api.line.me/v2/bot/message/push';
    let options = {
        'method': 'post',
        'headers': {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': `Bearer ${LINE_CHANNEL_TOKEN}`
        },
        'payload': JSON.stringify({
            to: targetId,
            messages: msgList
        })
    };
    let response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText('UTF-8'));
}

/**
 * LINEに応答メッセージを送信する
 * @param {String} replyToken リプライトークン
 * @param {Object} msgList メッセージリスト
 */
function sendLineReply(replyToken, msgList) {
    let url = 'https://api.line.me/v2/bot/message/reply';
    let options = {
        'method': 'post',
        'headers': {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': `Bearer ${LINE_CHANNEL_TOKEN}`
        },
        'payload': JSON.stringify({
            replyToken: replyToken,
            messages: msgList
        })
    };
    let response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText('UTF-8'));
}