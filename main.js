const puppeteer = require('puppeteer')
const path = require('path')
const MarkdownIt = require('markdown-it')
const express = require('express')
const fs = require('fs')
const app = express()
const port = 13680

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

app.get('/readme', async (req, res) => {
  const md = new MarkdownIt()
  const readmeStr = fs.readFileSync('./README.MD', { encoding: 'utf-8' })
  const result = md.render(readmeStr)
  res.send(result)
})

app.post('/removebg', async (req, res) => {
  try {
    if (!req.body || !req.body.url) {
      return res.status(400).send({ reason: `no url provided in body` })
    }
    const result = await getImage(req.body.url)
    res.send({ result })
  } catch (e) {
    res.status(500).send({ reason: e.message })
  }
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

async function getImage(url) {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  page.on('dialog', async (dialog) => {
    await dialog.accept(url)
  })
  await page.goto('https://www.remove.bg/upload')
  const btn = await page.waitForSelector('.select-photo-url-btn')
  btn.click()
  await page.waitForSelector('img.transparency-grid')
  const resultImageSrc = await page.$eval('img.transparency-grid', (el) => el.src)
  await browser.close()
  return resultImageSrc
}
