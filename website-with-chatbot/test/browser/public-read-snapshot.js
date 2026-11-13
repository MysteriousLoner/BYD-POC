// Layout matrices reuse real read responses rather than exhausting the shared API limiter.
// Mutation, publication, error and form-submission regressions continue to call the API directly.
async function snapshotPublicReads(page,request){
 for(const resource of ['models','settings','branches','news']){
  const response=await request.get('/api/content/'+resource);
  if(!response.ok())throw Error('Public fixture read failed: '+resource+' ('+response.status()+')');
  await page.route('**/api/content/'+resource,route=>route.fulfill({response}));
 }
}
module.exports={snapshotPublicReads};
