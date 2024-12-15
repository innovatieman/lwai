import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
// import { UniqueArrayPipe } from './unique-array.pipe';
import { DateFormatPipe } from './date-format.pipe';
import { CleanHtmlPipe } from './clean-html.pipe';
import { FilterKeyPipe } from './filter-key.pipe';
import { ArrayItemPipe } from './array-item.pipe';
import { SplitArrayPipe } from './split-array.pipe';
import { NanToZeroPipe } from './nan-to-zero.pipe';
import { SanitizeHtmlPipe } from './sanitize-html.pipe';
import { FilterSearchPipe } from './filter-search.pipe';
import { SortByPipe } from './sort-by.pipe';
import { ReplaceStrPipe } from './replace-str.pipe';
import { CapitalizePipe } from './capitalize.pipe';
import { ParseIntPipe } from './parse-int.pipe';
import { EllipsisPipe } from './ellipsis.pipe';
import { MaxLengthPipe } from './max-length.pipe';
import { CleanReactionPipe } from './clean-reaction.pipe';
import { ParseChoicesPipe } from './parse-choices.pipe';
import { LastesAssistantItemPipe } from './lastes-assistant-item.pipe';
import { ParseJSONPipe } from './parse-json.pipe';
import { GroupByPipe } from './group-by.pipe';


@NgModule({
  declarations: [
    DateFormatPipe,
    CleanHtmlPipe,
    FilterKeyPipe,
    ArrayItemPipe,
    SplitArrayPipe,
    NanToZeroPipe,
    SanitizeHtmlPipe,
    FilterSearchPipe,
    SortByPipe,
    ReplaceStrPipe,
    CapitalizePipe,
    ParseIntPipe,
    EllipsisPipe,
    MaxLengthPipe,
    CleanReactionPipe,
    ParseChoicesPipe,
    LastesAssistantItemPipe,
    ParseJSONPipe,
    GroupByPipe
  ],
  imports: [
    CommonModule
  ],
  exports:[
    DateFormatPipe,
    CleanHtmlPipe,
    FilterKeyPipe,
    ArrayItemPipe,
    SplitArrayPipe,
    NanToZeroPipe,
    SanitizeHtmlPipe,
    FilterSearchPipe,
    SortByPipe,
    ReplaceStrPipe,
    CapitalizePipe,
    ParseIntPipe,
    EllipsisPipe,
    MaxLengthPipe,
    CleanReactionPipe,
    ParseChoicesPipe,
    LastesAssistantItemPipe,
    ParseJSONPipe,
    GroupByPipe],
  providers:[
    CleanHtmlPipe,
    DecimalPipe,
    FilterKeyPipe,
    FilterSearchPipe,
    SortByPipe]
})
export class PipesModule { }
