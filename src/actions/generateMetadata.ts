import { Attribute, Token } from '../defs'
import {
  resolveConfiguration,
  resolveManifest,
  shouldIncludeTraitInMetadata,
} from '../util'
import fs from 'fs'
import delay from 'delay'
import { tap } from 'lodash'

export default async function (
  task: null | {
    output: string
    title: string
  }
): Promise<void> {
  const manifest = resolveManifest()
  const config = resolveConfiguration()

  // Generate assets folder...
  if (task) {
    task.output = 'Generating assets folder...'
  }

  if (!fs.existsSync('./assets')) {
    fs.mkdirSync('./assets')
  }

  let dynamicAttributes = <any>[];

  // Generate asset metadata...
  for (const item of manifest) {
    const { tokenId } = item as any
    const fileNumber = tokenId - 1
    let filePath = `./assets/${fileNumber}.json`

    tap(createToken(tokenId, item, config), (args) => {
      if (task) {
        task.output = `Generating asset metadata '${filePath}'`
      }
      fs.writeFileSync(filePath, JSON.stringify(args.token, null, 2), { flag: 'w' });
      dynamicAttributes.push(args.dynamicData)
    })

    await delay(10)
  }

  fs.writeFileSync("./dynamicAttributes.json", JSON.stringify(dynamicAttributes))
}

export function createToken(number: number, item: Attribute, config: Token) {
  const token = {
    name: `${config.name} #${number}`,
    symbol: config.symbol ?? '',
    description: config.description,
    seller_fee_basis_points: config.sellerFeeBasisPoints,
    image: 'image.png',
    animation_url: 'text.html',
    external_url: config.external_url,
    attributes: <any>[],
    collection: {
      name: config.collection.name,
      family: config.collection.family,
    },
    properties: {
      category: 'image',
      creators: config.creators,
      files: [
        {
          uri: `${number - 1}.png`,
          type: 'image/png',
        },
        {
          uri: `${number - 1}.html`,
          type: 'text/html'
        }
      ],
    },
  }

  const dynamicData = {
    name: `${config.name} #${number}`,
    dynamic_attributes: <any>[]
  }

  Object.keys(item).forEach((k: string) => {
    if (shouldIncludeTraitInMetadata(k)) {
      // @ts-ignore
      if (item[k].name != "Notrait" && item[k].name != "H-Notrait") {
        if (k == 'Location' || k == 'Wave' || k == 'Board') {
          dynamicData['dynamic_attributes'].push({ trait_type: k, value: item[k].name })
        } else if (k == 'Face') {
            const face = item[k].name.split('-'.replace('_', ' '))
            token['attributes'].push({ trait_type: k, value: face[0] });
            if (face[1]) {
                token['attributes'].push({ trait_type: 'Beard', value: face[1] });
            }
        } else {
          if (item[k].name.includes('H-')) {
            token['attributes'].push({ trait_type: k, value: item[k].name.replace('H-', '') as string })      
          } else {
            token['attributes'].push({ trait_type: k, value: item[k].name as string })      
          }
        }
      } else {
        return;
      }
    }
  })

  return {token, dynamicData}
}
