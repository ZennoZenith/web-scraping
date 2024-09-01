import * as cheerio from 'cheerio'

const FILE_PRIFIX = 'studyguide'
const PHYSICS_URL =
  'https://www.studyguide360.com/2020/03/physics-study-material-iit-jee-mains-advanced.html'
const CHEMISTRY_URL =
  'https://www.studyguide360.com/2020/03/chemistry-study-material-iit-jee-mains-advanced.html'
const MATHS_URL =
  'https://www.studyguide360.com/2020/03/maths-study-material-iit-jee-mains-advanced.html'

async function writeJson(filePath: string, data: any) {
  try {
    // await Bun.write(filePath, JSON.stringify(data, null, 2))
    await Bun.write(
      filePath,
      JSON.stringify(data, function (_k, v) {
        return v === undefined ? null : v
      }, 2),
    )
  } catch (e) {
    console.error('Cannot write to file due to stringify error', e)
  }
}

async function write(url: string, subject: string) {
  const path = `./files/${FILE_PRIFIX}_${subject}_home.html`

  const websiteHome = await fetch(url)
  const websiteHomeString = await websiteHome.text()
  // const $ = await cheerio.fromURL('https://example.com')

  await Bun.write(path, websiteHomeString)

  console.log('Written to file')
}

async function read(subject: string) {
  const path = `./files/${FILE_PRIFIX}_${subject}_home.html`
  const file = Bun.file(path)

  const text = await file.text()
  // console.log(text)
  return text
}

interface FinalDataObj {
  chapterTitle: string
  href: string
  fileId: string
  betterTitle: string
}

function readClearIit(data: string, subject: string) {
  const finalData: FinalDataObj[] = []
  const $ = cheerio.load(data)
  const chaptersElements = $('ul > li > span a')

  for (let i = 0; i < chaptersElements.length; i++) {
    const chapter = cheerio.load(chaptersElements[i])
    const chapterTitle = chapter.text().trim()
    let betterTitle = chapterTitle
    if (subject === 'physics') {
      betterTitle = chapterTitle.replace(
        'IIT JEE Physics Notes for ',
        '',
      ).replace(
        'IIT JEE Physics Notes for ',
        '',
      )
    } else if (subject === 'chemistry') {
      betterTitle = chapterTitle.replace(
        'IIT JEE Chemistry Notes for ',
        '',
      ).replace(
        'IIT JEE Chemistry Notes for ',
        '',
      )
    } else if (subject === 'maths') {
      betterTitle = chapterTitle.replace(
        'IIT JEE Maths Notes for ',
        '',
      ).replace(
        'IIT JEE Maths Notes for ',
        '',
      )
    }
    const href = chaptersElements[i].attribs.href?.trim()
    finalData.push({
      chapterTitle,
      href,
      fileId: extractIdFromLink(href),
      betterTitle,
    })
  }
  //   const noteTitle = card('.notes-title').text().trim()

  //   const buttons = card('a.btn.btn-block')
  //   const theory = buttons[0].attribs.href?.trim()
  //   const solvedExamples = buttons[1].attribs.href?.trim()
  //   const practiceExercise = buttons[2].attribs.href?.trim()

  // }

  console
  return finalData
}

function extractIdFromLink(link: string) {
  // "href": "https://drive.google.com/open?id=1nw5Tp2bYpv8wryjBfcrSzyvMVt9ebMuM"
  let id = link.split('id=')[1]
  return id
}

async function main() {
  let subject = 'maths'
  // await write(CHEMISTRY_URL, 'chemistry')
  // await write(MATHS_URL, 'maths')

  const htmlString = await read(subject)
  // const htmlString = await read()
  // console.log(htmlString)

  const t = readClearIit(htmlString, subject)

  const path = `./output/${FILE_PRIFIX}_${subject}_home.json`
  await writeJson(path, t)
  console.log('Written output to file')
}

main()
