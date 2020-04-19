const puppeteer = require('puppeteer')
const path = require('path')
const MarkdownIt = require('markdown-it')
const express = require('express')
const fs = require('fs')
const app = express()

/**
 * 运行此文件时的传参
 * {
 *    port?:     number  default: 13680
 *    headless?: boolean default: win -> false, other -> true
 * }
 */
const argv = require('optimist').argv

const isWin = !!process.platform.match(/win/i)
const isHeadless = !isWin ? true : !!argv.headless
const port = argv.port || 13680

let missionOrderId = 0

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

app.get('/readme', async (req, res) => {
  const md = new MarkdownIt()
  const readmeStr = fs.readFileSync('./README.MD', { encoding: 'utf-8' })
  const result = md.render(readmeStr)
  res.send(result)
})

app.post('/removebg', async (req, res) => {
  missionOrderId++
  try {
    if (!req.body || !req.body.url) {
      return res.status(400).send({ reason: `no url provided in body` })
    }
    console.log(`${missionOrderId} request: ${JSON.stringify(req.body)}`)
    const proxy = req.body.proxy
    const result = await getImage(req.body.url, proxy, missionOrderId)
    res.send(result)
  } catch (e) {
    res.status(500).send({ reason: e.message })
  }
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

async function getImage(url, proxy, id) {
  let browser = null
  try {
    const start = new Date().getTime()
    let beforeInputUrl = 0
    const browserArgs = ['--no-sandbox', '--disable-setuid-sandbox']
    if (proxy) {
      // example: 219.136.204.249:88
      browserArgs.push(`--proxy-server=${proxy}`)
    }
    browser = await puppeteer.launch({ headless: isHeadless, args: browserArgs })
    const afterBrowser = new Date().getTime()
    const page = await browser.newPage()
    console.log(`${id}: page is open`)
    const afterPage = new Date().getTime()
    page.on('dialog', async (dialog) => {
      beforeInputUrl = new Date().getTime()
      console.log(`${id}: input url`)
      await dialog.accept(url)
    })
    await page.goto('https://www.remove.bg/upload', { timeout: 45 * 1000 })
    const btn = await page.waitForSelector('.select-photo-url-btn', { timeout: 45 * 1000 })
    const afterPageOpen = new Date().getTime()
    console.log(`${id}: site is open`)
    btn.click()
    await Promise.race([
      new Promise(async (resolve, reject) => {
        resolve(await page.waitForSelector('img.transparency-grid', { timeout: 45 * 1000 }).catch((err) => reject(err)))
      }),
      new Promise(async (resolve, reject) => {
        await page.waitForSelector('.checkbox-captcha', { timeout: 45 * 1000 }).catch((err) => reject(err))
        reject(Error('出现人机验证界面，放弃当前任务！'))
      }),
      new Promise(async (resolve, reject) => {
        await page.waitForSelector('.alert-danger', { timeout: 45 * 1000 }).catch((err) => reject(err))
        const errMessage = await page.$eval('.alert-danger', (el) =>
          el.innerHTML.replace(/[\r\n]/g, '').replace(/\ +/g, ''),
        )
        reject(Error(`抠图失败: ${errMessage}`))
      }),
    ])
    await page.waitForSelector('img.transparency-grid')
    const resultImageSrc = await page.$eval('img.transparency-grid', (el) => el.src)
    const afterResult = new Date().getTime()
    console.log(`${id}: get image result, browser closed`)
    await browser.close()
    return {
      time: {
        openBrowser: afterBrowser - start,
        openPage: afterPage - afterBrowser,
        openSite: afterPageOpen - afterPage,
        inputImageUrl: beforeInputUrl - afterPageOpen,
        getResult: afterResult - beforeInputUrl,
        total: afterResult - start,
      },
      result: resultImageSrc,
    }
  } catch (e) {
    console.log(`${id} Error: ${e.message} !!!!!!!!`)
    browser && browser.close()
    throw e
  }
}
