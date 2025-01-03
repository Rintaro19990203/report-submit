const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const app = express();
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const multer = require('multer');
const session = require('express-session');



app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files statically


app.use(session({
    secret: 'secret-key',  
    resave: false,
    saveUninitialized: true
}));


const upload = multer({ dest: path.join(__dirname, 'uploads/') });

require('dotenv').config();
const transporter = nodemailer.createTransport({
    host: 'mail1030.onamae.ne.jp',
    PORT: 465,
    secure: 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


app.get("/", (req, res) => {
    const { formData } = req.session;
    res.send(`
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>日報</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM" crossorigin="anonymous">
            <link rel="stylesheet" href="style.css">
        </head>
        <body>
          <div class="form-container">
            <form action="/review" method="post" enctype="multipart/form-data">
              <div class="mb-3">
                <label for="name" class="form-label">氏名</label>
                <select class="form-control" id="name" name="name" required>
                  <option value="">氏名を選択してください</option>
                  <option value="関谷周司" ${formData && formData.name === '関谷周司' ? 'selected' : ''}>関谷周司</option>
                  <option value="関谷峰子" ${formData && formData.name === '関谷峰子' ? 'selected' : ''}>関谷峰子</option>
                  <option value="上野良一" ${formData && formData.name === '上野良一' ? 'selected' : ''}>上野良一</option>
                  <option value="出口良助" ${formData && formData.name === '出口良助' ? 'selected' : ''}>出口良助</option>
                  <option value="中井勝" ${formData && formData.name === '中井勝' ? 'selected' : ''}>中井勝</option>
                </select>
              </div>

              <div class="mb-3">
                <label for="place" class="form-label">勤務場所</label>
                <select class="form-control" id="place" name="place" required>
                  <option value="">勤務場所を選択してください</option>
                  <option value="レポー" ${formData && formData.place === 'レポー' ? 'selected' : ''}>レポー</option>
                  <option value="エスポワール" ${formData && formData.place === 'エスポワール' ? 'selected' : ''}>エスポワール</option>
                </select>
              </div>

              <div class="mb-3">
                <label for="date" class="form-label">日付</label>
                <input type="date" class="form-control" id="date" name="date" value="${formData ? formData.date : ''}" required>
              </div>
              <div class="mb-3">
                <label for="start_time" class="form-label">開始時間</label>
                <input type="time" class="form-control" id="start_time" name="start" value="${formData ? formData.start : ''}" required>
              </div>
              <div class="mb-3">
                <label for="end_time" class="form-label">終了時間</label>
                <input type="time" class="form-control" id="end_time" name="end" value="${formData ? formData.end : ''}" required>
              </div>
              <div class="mb-3">
                <label for="work_hours" class="form-label">勤務時間</label>
                <div>
                    <select id="work_hours" name="hours" class="form-select" required>
                        <option value="">-- 時間 --</option>
                        ${Array.from({ length: 6 }, (_, i) => `<option value="${i}" ${formData && formData.hours == i ? 'selected' : ''}>${i} 時間</option>`).join('')}
                    </select>
                    <select id="work_minutes" name="minutes" class="form-select" required>
                        <option value="">-- 分 --</option>
                        ${Array.from({ length: 4 }, (_, i) => `<option value="${i * 15}" ${formData && formData.minutes == i * 15 ? 'selected' : ''}>${i * 15} 分</option>`).join('')}
                    </select>
                </div>
              </div>
              <div class="mb-3">
                <label for="nextDate" class="form-label">次回出勤日</label>
                <input type="date" class="form-control" id="nextDate" name="nextDate" value="${formData ? formData.nextDate : ''}" required>
              </div>
              <div class="mb-3">
                <label for="content" class="form-label">業務内容</label>
                <textarea class="form-control" id="content" name="content" rows="8" required>${formData ? formData.content : ''}</textarea>
              </div>
              <div class="mb-3">
                <label for="notice" class="form-label">気づいたこと</label>
                <textarea class="form-control" id="notice" name="notice" rows="8">${formData ? formData.notice : ''}</textarea>
              </div>
              <div class="mb-3">
                <label for="photos" class="form-label">写真を追加</label>
                <input type="file" class="form-control" id="photos" name="photos" accept="image/*" multiple>
              </div>
              <button type="submit" class="btn btn-primary">確認する</button>
            </form>
          </div>
        </body>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js" integrity="sha384-geWF76RCwLtnZ8qwWowPQNguL3RmwHVBC9FhGdlKrxdiJJigb/j/68SIy3Te4Bkz" crossorigin="anonymous"></script>
        </html>
    `);
});


const imageToBase64 = (filePath) => {
    const image = fs.readFileSync(filePath);
    return `data:image/jpeg;base64,${image.toString('base64')}`;
};


app.post('/review', upload.array('photos', 5), (req, res) => {
    const { name, place, date, content, notice, start, end, nextDate, hours, minutes} = req.body;
    const photoPaths = req.files.map(file => `/uploads/${file.filename}`);

    req.session.formData = { name, place, date, content, notice, start, end, photoPaths, nextDate, hours, minutes};


    // Generate HTML content for the review page
    const htmlContent = `


    <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>日報確認</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM" crossorigin="anonymous">
            <style>
                body {margin: 5% auto;}
                h1 { text-align: center; margin-top: 7%; margin-bottom: 7%; }
                p {font-size: 20px; word-wrap: break-word; white-space: pre-wrap;}
                .query { font-weight: bold;}
                img { display: block; margin: 0 auto; max-width: 100%; height: auto; }
                .container { width: 80%; margin: auto; }
                .content { margin: 20px 0; }
                .btn { display: inline-block; margin: 10px; }
                .button-container { display: flex; justify-content: center; align-items: center;}
                #loading {display: none;}
            </style>

            <script>
                function showLoading() {
                    document.getElementById('loading').style.display = 'block';
                    document.getElementById('container').style.display = 'none';
                }
            </script>

        </head> 
        <body>
            <div class="container" id="container">
                <h1>日報確認</h1>
                <div class="content">
                    <p class="query">日付:</p>
                    <p>${date}</p>
                </div>
                <div class="content">
                    <p class="query">名前:</p>
                    <p>${name}</p>
                </div>
                <div class="content">
                    <p class="query">勤務場所:</p>
                    <p>${place}</p>
                </div>
                <div class="content">
                    <p class="query">業務時間:</p>
                    <p>${start} - ${end} 　(${hours}時間${minutes}分)</p>
                </div>
                <div class="content">
                    <p class="query">次回出勤日:</p>
                    <p>${nextDate}</p>
                </div>
                <div class="content">
                    <p class="query">業務内容:</p>
                    <p>${content}</p>
                </div>
                <div class="content">
                    <p class="query">気づいたこと:</p>
                    <p>${notice}</p>
                </div>
                <div class="content">
                    <p class="query">添付写真:</p>
                    ${photoPaths.map(photoPath => `<img src="${photoPath}" alt="photo"><br>`).join('')}
                </div>
                <div class="button-container">
                    <form action="/generate-pdf" method="post" style="display: inline;" onsubmit="showLoading()">
                        ${Object.entries(req.body).map(([key, value]) => `<input type="hidden" name="${key}" value="${value}">`).join('')}
                        ${photoPaths.map(photoPath => `<input type="hidden" name="photoPaths" value="${photoPath}">`).join('')}
                        <button type="submit" class="btn btn-primary">送信</button>
                    </form>
                    <form action="/" method="get" style="display: inline;">
                        <button type="submit" class="btn btn-secondary">戻る</button>
                    </form>
                </div>
            </div>

            <div id="loading">
                <h1>送信中です... 少々お待ちください</h1>
            </div>                      

        </body>
        </html>
    `;

    res.send(htmlContent);
});


app.post('/generate-pdf', upload.array("photos", 5), async (req, res) => {

    const { name, place, date, content, notice, start, end, photoPaths, nextDate, hours, minutes} = req.body;
    const photoPathsArray = (Array.isArray(photoPaths) ? photoPaths : [photoPaths]).filter(Boolean).map(p => path.join(__dirname, p));


    try {
        const htmlContent = `
            <html>
            <head>
                <title>日報</title>
                <style>
                    h1 {
                        text-align: center;
                        margin-top: 7%;
                        margin-bottom: 7%;
                    }

                    .query {
                        font-weight: bold;
                    }
                
                    img {
                        display: block; 
                        margin: 0 auto; 
                        max-width: 100%; 
                        height: auto;
                    }
                </style>
            </head>
            <body>
                <h1>業務日報</h1>
                <p class="query">日付:</p>
                <p>${date}</p>
                <br>
                <p class="query">名前:</p>
                <p>${name}</p>
                <br>
                <p class="query">勤務場所:</p>
                <p>${place}</p>
                <br>
                <p class="query">業務時間:</p>
                <p>${start} - ${end} 　(${hours}時間${minutes}分)</p>
                <br>
                <p class="query">次回出勤日:</p>
                <p>${nextDate}</p>
                <br>
                <p class="query">業務内容:</p>
                <pre>${content}</pre>
                <br>
                <p class="query">気づいたこと:</p>
                <pre>${notice}</pre>
                ${photoPathsArray.length > 0 ? `
                <br>
                <p class="query">添付写真:</p>
                ${photoPathsArray.map(photoPath => `<img src="${imageToBase64(photoPath)}"><br>`).join('')}` : ''}
                </body>
            </html>
        `;

        // Generate the PDF using Puppeteer
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent);
        const pdfBuffer = await page.pdf();
        await browser.close();

        // Save the PDF file
        const pdfPath = path.join(__dirname, '日報.pdf');
        fs.writeFileSync(pdfPath, pdfBuffer);

        // Set up email options
        const mailOptions = {
            from: 'main@lavienne.tech',
            to: ['rintaronakai@gmail.com', 'tamami196831@gmail.com', 'etpy0623.mu@gmail.com'],
            subject: `日報　${name}です`,
            text: 'PDFファイルを添付します。',
            attachments: [{ filename: `${date}.pdf`, path: pdfPath }]
        };


    
        // Send the email
        transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                console.error(error);
                return res.status(500).send('メール送信に失敗しました。');
            }
            console.log('Email sent: ' + info.response);

            await Promise.all(photoPathsArray.map(photoPath => fs.promises.unlink(photoPath)));
            await fs.promises.unlink(pdfPath);

            // Clear session data
            req.session.destroy();

            // Send confirmation page
            res.send(`

                <!DOCTYPE html>
                <html lang="ja">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>送信完了</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM" crossorigin="anonymous">
                    <style>
                        h1 {
                            text-align: center;
                            margin-top: 7%;
                            margin-bottom: 7%;
                        }

                        form {
                            text-align: center;
                        }

                    </style>
                </head>
                <body>
                    <h1>本日もありがとうございました。</h1>
                    <form action="/" method="get" style="">
                        <button type="submit" class="btn btn-primary">戻る</button>
                    </form>
                </body>
                </html>
            `);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send(`PDF生成に失敗しました。 Error: ${error.message}`);
        }
    });

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


     
