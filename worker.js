const TXT_FILE_URL = '替换自己的txt文件地址';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})

async function handleRequest(event) {
  const request = event.request
  const url = new URL(request.url)
  
  if (url.pathname === '/') {
    return await handleRandomImage(event)
  } else if (url.pathname.startsWith('/proxy-image')) {
    return await handleProxyImage(url.searchParams.get('url'))
  } else {
    return new Response('Not Found', { status: 404 })
  }
}

async function handleRandomImage(event) {
  try {
    const cache = caches.default
    let response = await cache.match(TXT_FILE_URL)
    
    if (!response) {
      response = await fetch(TXT_FILE_URL)
      if (!response.ok) {
        return new Response(`Failed to fetch TXT file: ${response.statusText}`, { status: 500 })
      }

      const text = await response.text()
      response = new Response(text, {
        headers: {
          'Cache-Control': 'public, max-age=31536000' // 设置缓存时间1年
        }
      })
      
      // 将响应放入缓存
      event.waitUntil(cache.put(TXT_FILE_URL, response.clone()))
    }

    const text = await response.text()

    // 解析所有图片链接
    const links = text.split('\n').filter(line => line.trim().length > 0)
    
    if (links.length === 0) {
      return new Response('No valid image links found', { status: 404 })
    }
    
    // 随机选择一个链接
    const randomIndex = Math.floor(Math.random() * links.length)
    const randomLink = links[randomIndex].trim()
    
    // 返回包含代理图片链接的HTML
    const proxyUrl = `/proxy-image?url=${encodeURIComponent(randomLink)}`
    return new Response(`
      <html>
        <head>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f0f0f0;
              font-family: Arial, sans-serif;
            }
            .container {
              text-align: center;
            }
            img {
              max-width: 100%;
              max-height: 80vh;
              border: 1px solid #ccc;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Random Image</h1>
            <img src="${proxyUrl}" alt="Random Image"/>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  } catch (error) {
    console.error('Error in handleRandomImage:', error)
    return new Response('Error occurred: ' + error.message, { status: 500 })
  }
}

async function handleProxyImage(imageUrl) {
  if (!imageUrl) {
    return new Response('Image URL is required', { status: 400 })
  }
  
  try {
    console.log(`Fetching image: ${imageUrl}`)
    const response = await fetch(imageUrl, {
      headers: {
        'Referer': new URL(imageUrl).origin // 设置Referer头以绕过防盗链
      }
    })
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.statusText}`)
      return new Response(`Failed to fetch image: ${response.statusText}`, { status: 500 })
    }

    const contentType = response.headers.get('Content-Type')
    const imageBody = await response.arrayBuffer()
    
    return new Response(imageBody, {
      headers: { 'Content-Type': contentType }
    })
  } catch (error) {
    console.error('Error in handleProxyImage:', error)
    return new Response('Error occurred: ' + error.message, { status: 500 })
  }
}
