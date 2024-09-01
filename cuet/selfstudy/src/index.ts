import { mkdir } from 'node:fs/promises'
import * as cheerio from 'cheerio'

const HOME_PAGE = {
  name: 'home',
  uri: 'https://www.selfstudys.com',
  htmlPath: './files/html',
  jsonPath: './files/json',
  pdfPath: './files/pdf',
  pathWithFileName: function (fileType: 'json' | 'html'): string {
    if (fileType === 'json') {
      return `${this.jsonPath}/${this.name}.json`
    } else {
      return `${this.htmlPath}/${this.name}.html`
    }
  },
} as const

type SaveHtmlOpt = {
  strip?: boolean // trims and strips .html from end of name
  replace?: boolean
}

function Sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function FileExists(path: string) {
  const file = Bun.file(path)
  return await file.exists()
}

async function ReadFromFile(pathWithFileName: string) {
  if (!(await FileExists(pathWithFileName))) {
    throw Error(`File ${pathWithFileName} does not exists`)
  }
  const file = Bun.file(pathWithFileName)
  const text = await file.text()
  return text
}

async function SaveHtmlFromUri(
  uri: string,
  path: string,
  name: string,
  opt: SaveHtmlOpt = {
    strip: true,
    replace: false,
  },
) {
  if (opt.strip !== false) {
    name = name.trim().replace(/\.html$/, '')
  }
  const pathWithFileName = `${path}/${name}.html`

  if (await FileExists(pathWithFileName) && opt.replace !== true) {
    throw Error(`File ${pathWithFileName} already exists`)
  }

  await mkdir(path, { recursive: true })

  console.log(`Downloading html from uri: ${uri}`)
  const websiteHome = await fetch(uri)
  const websiteHomeString = await websiteHome.text()
  await Bun.write(pathWithFileName, websiteHomeString)
  console.log(`Saved ${name}.html to path: ${path}`)
  return websiteHomeString
}

async function SaveAsJson(data: any, filePathWithName: string) {
  try {
    await Bun.write(
      filePathWithName,
      JSON.stringify(data, function (_k, v) {
        return v === undefined ? null : v
      }, 2),
    )
  } catch (e) {
    console.error('Cannot write to file due to JSON stringify error', e)
  }
}

async function LoadAsJSON<T = HomePageData>(pathWithFileName: string) {
  let text = await ReadFromFile(pathWithFileName)
  return JSON.parse(text) as T
}

async function DownloadHomeHtml() {
  return await SaveHtmlFromUri(
    HOME_PAGE.uri,
    HOME_PAGE.htmlPath,
    HOME_PAGE.name,
  )
}

async function ReadHomeHtml(reDownload: boolean = false) {
  if (reDownload) {
    return await DownloadHomeHtml()
  }
  return await ReadFromFile(HOME_PAGE.pathWithFileName('html'))
}

interface HomePageData {
  baseUri: string
  navItems: {
    title: string
    subNavItems: {
      title: string
      uri: string
    }[]
  }[]
}

async function ParseHomePageHtml(homePageHtml: string): Promise<HomePageData> {
  const homePageData: HomePageData = {
    baseUri: HOME_PAGE.uri,
    navItems: [],
  }
  const $ = cheerio.load(homePageHtml)
  const navBarItems = $('#navbarSupportedContent > ul > li')

  for (const items of navBarItems) {
    const t1 = cheerio.load(items)('a')
    const navTitle = t1.first().text().trim()
    const subNavItems: {
      title: string
      uri: string
    }[] = []

    const t2 = cheerio.load(items)('.full-menu > div > div > ul > li > a')
    for (const subNavItem of t2) {
      const subNavText = cheerio.load(subNavItem).text()
      subNavItems.push({
        title: subNavText,
        uri: subNavItem.attribs['href'] || '',
      })
    }
    homePageData.navItems.push({ title: navTitle, subNavItems })
    // console.log('==================================')
    // break
  }
  return homePageData
}

async function DownloadAllHomePageNavItems(homePageData: HomePageData) {
  homePageData.navItems.forEach(async (item, _index) => {
    const path = `./files/html/${item.title}`
    item.subNavItems.forEach(async (subItem, _index) => {
      await SaveHtmlFromUri(subItem.uri, path, subItem.title)
    })
  })
}

interface TopicContent {
  baseUri: string
  contents: {
    index: number
    id: string
    title: string
    uri: string
  }[]
}

async function ParseAllTopicContent(
  homePageData: HomePageData,
  reDownload: boolean = false,
) {
  for (let navItem of homePageData.navItems) {
    const path = `./files/html/${navItem.title}`
    for (let subNavItem of navItem.subNavItems) {
      let subNavItemHtml: string
      if (reDownload === true) {
        subNavItemHtml = await SaveHtmlFromUri(
          subNavItem.uri,
          path,
          subNavItem.title,
          {
            replace: true,
          },
        )
      } else {
        subNavItemHtml = await ReadFromFile(`${path}/${subNavItem.title}.html`)
      }
      const topicContent = await ParseTopicContent(
        subNavItemHtml,
      )
      await SaveAsJson(
        topicContent,
        `./files/json/${navItem.title}/${subNavItem.title}.json`,
      )
    }
  }
}

async function ParseTopicContent(html: string) {
  const $ = cheerio.load(html)
  const listItems = $('.sample-paper > ul > li')

  const topicContent: TopicContent = {
    baseUri: HOME_PAGE.uri,
    contents: [],
  }
  let index = 1
  for (const items of listItems) {
    const id = items.attribs?.id
    const t1 = cheerio.load(items)('a')
    const navTitle = t1.first().text().trim().split(' ')
    navTitle.shift()
    const t2 = navTitle.join(' ')
    let uri = t1.attr('href') || ''
    if (uri.startsWith('/')) {
      uri = `${HOME_PAGE.uri}${uri}`
    }
    if (uri.includes('javascript:void(0)')) {
      uri = ''
    }

    topicContent.contents.push({
      index,
      id,
      title: t2,
      uri: uri,
    })
    index += 1
  }
  return topicContent
}

interface ExtendedTopicContent {
  baseUri: string
  contents: {
    index: number
    id: string
    title: string
    uri: string
    contents: {
      index: string
      title: string
      pdfHtmlUri: string
      hdPdfHtmlUri: string
      pdfDownloadUri: string
      hdPdfDownloadUri: string
    }[]
  }[]
}

type NavItem =
  | 'State Books'
  | 'NCERT Books & Solutions'
  | 'Books & Solutions'
  | 'CBSE'
  | 'JEE'
  | 'NEET'
  | 'CUET'
  | 'CAT'

async function ExtendAllTopicContent(
  homePageData: HomePageData,
  navItemType: NavItem,
  downloadOnly: boolean = false,
) {
  for (const navItem of homePageData.navItems) {
    const jsonPath = `./files/json/${navItem.title}`
    const htmlPath = `./files/html/${navItem.title}`
    const extendedTopicContent: ExtendedTopicContent = {
      baseUri: '',
      contents: [],
    }
    if (navItem.title !== navItemType) {
      continue
    }

    for (const subNavItem of navItem.subNavItems) {
      if (subNavItem.title !== 'Mathematics') {
        // if (subNavItem.title !== 'English') {
        continue
      }

      let subNavItemJson = await LoadAsJSON<TopicContent>(
        `${jsonPath}/${subNavItem.title}.json`,
      )
      extendedTopicContent.baseUri = subNavItemJson.baseUri
      for (const topicContent of subNavItemJson.contents) {
        // if (topicContent.title !== 'CUET Maths Notes') {
        //   // if (topicContent.title !== 'CUET English Notes') {
        //   continue
        // }
        const pathBase = `${htmlPath}/${subNavItem.title}`
        const extendedTopicContentContent = await ExtendTopicContent(
          pathBase,
          topicContent,
          downloadOnly,
        )
        extendedTopicContent.contents.push({
          ...topicContent,
          contents: extendedTopicContentContent
            ? extendedTopicContentContent
            : [],
        })
      }

      if (downloadOnly === true) {
        continue
      }

      await SaveAsJson(
        extendedTopicContent,
        `./files/json/${navItem.title}/${subNavItem.title}.extended.json`,
      )
      console.log(`Saved ${navItem.title}/${subNavItem.title}.extended.json`)
    }
  }
}

async function ExtendTopicContent(
  pathBase: string,
  topicContent: TopicContent['contents'][number],
  downloadOnly: boolean = false,
) {
  const path = pathBase
  const name = `${
    topicContent.index.toString().padStart(2, '0')
  }_${topicContent.title}`

  if (topicContent.uri === '') {
    return []
  }

  let extendedTopicHtml: string
  if (downloadOnly === true) {
    extendedTopicHtml = await SaveHtmlFromUri(
      topicContent.uri,
      path,
      name,
      {
        replace: true,
      },
    )
    return undefined
  } else {
    extendedTopicHtml = await ReadFromFile(`${path}/${name}.html`)
    return await ParseExtendedTopic(extendedTopicHtml)
  }
}

async function ParseExtendedTopic(
  extendeTopicHtml: string,
) {
  const $ = cheerio.load(extendeTopicHtml)
  const listItems = $('.sample-paper > ul > li')

  const extendedTopicContent:
    ExtendedTopicContent['contents'][number]['contents'] = []
  // let index = 1
  for (const items of listItems) {
    const chapterIndex = cheerio.load(items)('a > div > span').text().trim()
    const chapterName = cheerio.load(items)('a > div > .chapterName').text()
      .trim()
    const pdfUriRelative = cheerio.load(items)('div > a')[0]?.attribs['href'] ||
      undefined
    const hdPdfUriRelative =
      cheerio.load(items)('div > a')[1]?.attribs['href'] || undefined

    const pdfHtmlUri = pdfUriRelative ? `${HOME_PAGE.uri}${pdfUriRelative}` : ''
    const hdPdfHtmlUri = hdPdfUriRelative
      ? `${HOME_PAGE.uri}${hdPdfUriRelative}`
      : ''

    const pdfDownloadUri = await ExtractPdfDownloadLink(pdfHtmlUri)
    const hdPdfDownloadUri = await ExtractPdfDownloadLink(hdPdfHtmlUri)

    extendedTopicContent.push({
      index: chapterIndex,
      title: chapterName,
      pdfHtmlUri,
      hdPdfHtmlUri,
      pdfDownloadUri,
      hdPdfDownloadUri,
    })
  }

  return extendedTopicContent
}

async function ExtractPdfDownloadLink(uri: string) {
  if (uri === '') {
    return ''
  }

  const htmlUriFetch = await fetch(uri)
  const html = await htmlUriFetch.text()

  // Regular expression to match URLs
  // const urlPattern = /https?:\/\/[^\s/$.?#].[^\s]*/gi
  const urlPattern = /downloadFile\(\"[^\s]*\"\)/g

  // Extract URLs
  const urls = html.match(urlPattern)
  if (!urls) {
    return ''
  }
  return urls?.[0].replace('downloadFile("', '').split('")')[0] || ''
}

type NuCompatable = {
  dir: string
  fileName: string
  uri: string
}[]

async function CreateNuCompatableJsonFormat(
  extendedTopic: ExtendedTopicContent,
  navItemsType: NavItem,
  subject: string,
) {
  let baseDir = `./files/pdf/${navItemsType}/${subject}`
  let nuCompatable: NuCompatable = []
  for (const topic of extendedTopic.contents) {
    // topic.
    const dir = `${baseDir}/${topic.title}`
    for (const c of topic.contents) {
      nuCompatable.push({
        dir,
        fileName: `${c.index.padStart(2, '0')}_${c.title}.pdf`,
        uri: c.pdfDownloadUri,
      })
    }
  }

  await SaveAsJson(nuCompatable, './temp.json')
}

async function main() {
  // const homePageHtml = await ReadHomeHtml()
  // const homePageData = await ParseHomePageHtml(homePageHtml)
  // await SaveAsJson(homePageData, HOME_PAGE.pathWithFileName('json'))
  /// ====================================================

  // let homePageDataJson = await LoadAsJSON<HomePageData>(
  //   HOME_PAGE.pathWithFileName('json'),
  // )
  // await DownloadAllHomePageNavItems(homePageDataJson)
  /// ====================================================

  // let homePageDataJson = await LoadAsJSON<HomePageData>(
  //   HOME_PAGE.pathWithFileName('json'),
  // )
  // await ParseAllTopicContent(homePageDataJson)
  /// ====================================================

  // let homePageDataJson = await LoadAsJSON<HomePageData>(
  //   HOME_PAGE.pathWithFileName('json'),
  // )
  // await ExtendAllTopicContent(homePageDataJson, 'CUET')
  /// ====================================================

  const subject = 'Mathematics'

  const filePath = `./files/json/CUET/${subject}.extended.json`
  const extendedTopics = await LoadAsJSON<ExtendedTopicContent>(filePath)
  await CreateNuCompatableJsonFormat(extendedTopics, 'CUET', subject)
  /// ====================================================
}

main()
