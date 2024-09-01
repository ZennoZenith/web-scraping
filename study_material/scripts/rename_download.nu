cd 'physics solved/'
let downloadNames = ls

mut index = 0
let d = (open ../../output/cleariitmedical_physics_home.json
| select noteTitle)
let len = ($downloadNames | length)

while $index < $len {
  let fileName = ($d | select ($index + 1) | get noteTitle).0
  let downloadFileName = ($downloadNames | select $index | get name).0
  # print $fileName
  # print $downloadFileName
  cp $downloadFileName $'($index + 2 | fill -a right -c '0' -w 2)_($fileName).pdf'

  # print $'Done ($fileName)'
  $index += 1
} 

