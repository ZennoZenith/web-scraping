import * as cheerio from 'cheerio'

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

async function write() {
  const url =
    'https://www.cleariitmedical.com/p/iit-jee-physics-study-notes.html'
  const path = './files/cleariitmedical_physics_home.html'

  const websiteHome = await fetch(url)
  const websiteHomeString = await websiteHome.text()
  // const $ = await cheerio.fromURL('https://example.com')

  await Bun.write(path, websiteHomeString)

  console.log('Written to file')
}

async function read() {
  const path = './files/cleariitmedical_physics_home.html'
  const file = Bun.file(path)

  const text = await file.text()
  // console.log(text)
  return text
}

interface FinalDataObj {
  noteTitle: string
  links: {
    theory: string
    solvedExamples: string
    practiceExercise: string
  }
}

function readClearIit(data: string) {
  const finalData: FinalDataObj[] = []
  const $ = cheerio.load(data)
  const notesCards = $('.col-xs-12.col-md-3.notes-border')
  for (let i = 0; i < notesCards.length; i++) {
    const card = cheerio.load(notesCards[i])
    const noteTitle = card('.notes-title').text().trim()

    const buttons = card('a.btn.btn-block')
    const theory = buttons[0].attribs.href?.trim()
    const solvedExamples = buttons[1].attribs.href?.trim()
    const practiceExercise = buttons[2].attribs.href?.trim()

    finalData.push({
      noteTitle,
      links: {
        theory,
        solvedExamples,
        practiceExercise,
      },
    })
  }

  return finalData
}

async function main() {
  const htmlString = await read()
  const t = readClearIit(htmlString)

  const path = './output/cleariitmedical_physics_home.json'
  await writeJson(path, t)
  console.log('Written output to file')
}

main()
