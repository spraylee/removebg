const puppeteer = require('puppeteer')
const path = require('path')
const MarkdownIt = require('markdown-it')
const express = require('express')
const fs = require('fs')
const app = express()
const port = 13680

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
  console.log(`${missionOrderId} request: ${JSON.stringify(req.body)}`)
  try {
    if (!req.body || !req.body.url) {
      return res.status(400).send({ reason: `no url provided in body` })
    }
    const result = await getImage(req.body.url, missionOrderId)
    res.send(result)
  } catch (e) {
    res.status(500).send({ reason: e.message })
  }
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

async function getImage(url, id) {
  let browser = null
  try {
    const start = new Date().getTime()
    let beforeInputUrl = 0
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      // args: ['--no-sandbox', '--disable-setuid-sandbox', '--proxy-server=219.136.204.249:88'],
    })
    const afterBrowser = new Date().getTime()
    const page = await browser.newPage()
    console.log(`${id}: page is open`)
    const afterPage = new Date().getTime()
    page.on('dialog', async (dialog) => {
      beforeInputUrl = new Date().getTime()
      console.log(`${id}: input url`)
      await dialog.accept(url)
    })
    await page.goto('https://www.remove.bg/upload')
    const btn = await page.waitForSelector('.select-photo-url-btn')
    const afterPageOpen = new Date().getTime()
    console.log(`${id}: site is open`)
    btn.click()
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
    console.log(`${id} Error: ${e.message} !!!`)
    browser && browser.close()
    throw e
  }
}
