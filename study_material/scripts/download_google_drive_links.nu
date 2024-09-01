mut index = 0
# let d = (open '../output/studyguide_physics_home.json'
# | select betterTitle fileId ) 
# let d = (open '../output/studyguide_chemistry_home.json'
# | select betterTitle fileId ) 
let d = (open '../output/studyguide_maths_home.json'
| select betterTitle fileId ) 

let len = ($d | length) 

while $index < $len {
  let fileId = ($d | select $index | get fileId).0
  let betterTitle = ($d | select $index | get betterTitle).0

  wget --no-check-certificate -q $'https://drive.google.com/uc?export=download&id=($fileId)' -O $'($index + 1 | fill -a right -c '0' -w 2)_($betterTitle).pdf'

  print $'Done ($betterTitle)'
  $index += 1
} 

